// Software rasterizer.
//
// tiny-skia draws rectangles and glyph masks into an RGBA pixmap. This is the
// v0 renderer: it works headlessly, needs no GPU, and sits behind the same
// computed layout as a future wgpu backend.

use cosmic_text::{SwashContent, SwashImage};
use tiny_skia::{
    FillRule, Paint, Path, PathBuilder, Pixmap, PixmapPaint, PremultipliedColorU8, Rect as SkRect,
    Transform,
};

use crate::layout::{ComputedLayout, Rect};
use crate::scene::{Color, NodeKind, Scene, TextAlign};
use crate::text::TextEngine;

pub struct RenderOptions {
    pub width: u32,
    pub height: u32,
    pub background: Color,
}

struct ResolvedText {
    size: f32,
    line_height: f32,
    weight: u16,
    color: Color,
    align: TextAlign,
}

pub fn render(
    scene: &Scene,
    layout: &ComputedLayout,
    text: &mut TextEngine,
    options: &RenderOptions,
) -> Result<Pixmap, String> {
    let mut pixmap = Pixmap::new(options.width, options.height)
        .ok_or_else(|| "paint: invalid pixmap size".to_string())?;
    let background = SkRect::from_xywh(0.0, 0.0, options.width as f32, options.height as f32)
        .ok_or_else(|| "paint: invalid background rect".to_string())?;
    let mut paint = Paint::default();
    paint.set_color_rgba8(
        options.background.r,
        options.background.g,
        options.background.b,
        options.background.a,
    );
    pixmap.fill_rect(background, &paint, Transform::identity(), None);

    let root = scene
        .nodes
        .get(&scene.root)
        .ok_or_else(|| "paint: root node missing".to_string())?;
    for child in &root.children {
        draw_node(
            scene,
            layout,
            text,
            &mut pixmap,
            *child,
            1.0,
            options.width as f32,
            options.height as f32,
        );
    }
    Ok(pixmap)
}

pub fn render_to_png(
    scene: &Scene,
    layout: &ComputedLayout,
    text: &mut TextEngine,
    path: &str,
    options: &RenderOptions,
) -> Result<(), String> {
    let pixmap = render(scene, layout, text, options)?;
    pixmap.save_png(path).map_err(|err| err.to_string())
}

#[allow(clippy::too_many_arguments)]
fn draw_node(
    scene: &Scene,
    layout: &ComputedLayout,
    text: &mut TextEngine,
    pixmap: &mut Pixmap,
    id: u32,
    inherited_opacity: f32,
    viewport_width: f32,
    viewport_height: f32,
) {
    let Some(node) = scene.nodes.get(&id) else {
        return;
    };
    let rect = layout.rects.get(&id).copied().unwrap_or_default();

    // Fully offscreen subtrees are skipped. v0 assumes children stay inside
    // their parent's rect (no absolutely positioned escapees); fragments have
    // a zero rect at the origin and always recurse.
    if node.kind != NodeKind::Fragment
        && (rect.x >= viewport_width
            || rect.y >= viewport_height
            || rect.x + rect.width <= 0.0
            || rect.y + rect.height <= 0.0)
    {
        return;
    }

    let opacity = (inherited_opacity * node.style.opacity).clamp(0.0, 1.0);

    match node.kind {
        NodeKind::Fragment => {
            for child in &node.children {
                draw_node(
                    scene,
                    layout,
                    text,
                    pixmap,
                    *child,
                    inherited_opacity,
                    viewport_width,
                    viewport_height,
                );
            }
        }
        NodeKind::View | NodeKind::Scroll => {
            if let Some(background) = node.style.background {
                draw_rect(
                    pixmap,
                    rect,
                    background.with_opacity(opacity),
                    node.style.border_radius,
                );
            }
            for child in &node.children {
                draw_node(
                    scene,
                    layout,
                    text,
                    pixmap,
                    *child,
                    opacity,
                    viewport_width,
                    viewport_height,
                );
            }
        }
        NodeKind::Text => {
            draw_text(scene, pixmap, text, node.id, &node.text, rect, opacity);
        }
        NodeKind::Image => {
            draw_rect(
                pixmap,
                rect,
                Color::rgb(0x26, 0x26, 0x26),
                node.style.border_radius,
            );
        }
    }
}

fn draw_rect(pixmap: &mut Pixmap, rect: Rect, color: Color, radius: f32) {
    if rect.width <= 0.0 || rect.height <= 0.0 || color.a == 0 {
        return;
    }
    let mut paint = Paint::default();
    paint.set_color_rgba8(color.r, color.g, color.b, color.a);
    paint.anti_alias = true;

    if radius > 0.5 {
        if let Some(path) = rounded_path(rect, radius) {
            pixmap.fill_path(
                &path,
                &paint,
                FillRule::Winding,
                Transform::identity(),
                None,
            );
        }
    } else if let Some(sk_rect) = SkRect::from_xywh(rect.x, rect.y, rect.width, rect.height) {
        pixmap.fill_rect(sk_rect, &paint, Transform::identity(), None);
    }
}

fn rounded_path(rect: Rect, radius: f32) -> Option<Path> {
    let r = radius.min(rect.width / 2.0).min(rect.height / 2.0);
    if r <= 0.0 {
        return SkRect::from_xywh(rect.x, rect.y, rect.width, rect.height)
            .map(PathBuilder::from_rect);
    }
    let x = rect.x;
    let y = rect.y;
    let right = rect.x + rect.width;
    let bottom = rect.y + rect.height;
    let mut builder = PathBuilder::new();
    builder.move_to(x + r, y);
    builder.line_to(right - r, y);
    builder.quad_to(right, y, right, y + r);
    builder.line_to(right, bottom - r);
    builder.quad_to(right, bottom, right - r, bottom);
    builder.line_to(x + r, bottom);
    builder.quad_to(x, bottom, x, bottom - r);
    builder.line_to(x, y + r);
    builder.quad_to(x, y, x + r, y);
    builder.close();
    builder.finish()
}

fn draw_text(
    scene: &Scene,
    pixmap: &mut Pixmap,
    text_engine: &mut TextEngine,
    node_id: u32,
    content: &str,
    rect: Rect,
    opacity: f32,
) {
    if content.is_empty() || rect.width <= 0.0 || rect.height <= 0.0 {
        return;
    }
    let style = resolve_text_style(scene, node_id);
    let color = style.color.with_opacity(opacity);
    let buffer = text_engine.buffer(
        content,
        style.size,
        style.line_height,
        style.weight,
        rect.width,
    );
    let TextEngine {
        font_system,
        swash_cache,
    } = text_engine;

    for run in buffer.layout_runs() {
        let offset = match style.align {
            TextAlign::Left => 0.0,
            TextAlign::Center => (rect.width - run.line_w).max(0.0) / 2.0,
            TextAlign::Right => (rect.width - run.line_w).max(0.0),
        };
        for glyph in run.glyphs {
            let physical = glyph.physical((rect.x + offset, rect.y + run.line_y), 1.0);
            let image = swash_cache.get_image(font_system, physical.cache_key);
            if let Some(image) = image {
                draw_glyph(
                    pixmap,
                    image,
                    physical.x + image.placement.left,
                    physical.y - image.placement.top,
                    color,
                );
            }
        }
    }
}

fn resolve_text_style(scene: &Scene, node_id: u32) -> ResolvedText {
    let mut chain = Vec::new();
    let mut current = Some(node_id);
    while let Some(id) = current {
        chain.push(id);
        current = scene.nodes.get(&id).and_then(|node| node.parent);
    }
    chain.reverse();

    let mut style = ResolvedText {
        size: 16.0,
        line_height: 16.0 * 1.4,
        weight: 400,
        color: Color::rgb(0xed, 0xed, 0xed),
        align: TextAlign::Left,
    };
    for id in chain {
        let Some(node) = scene.nodes.get(&id) else {
            continue;
        };
        if let Some(size) = node.style.font_size {
            style.size = size;
            style.line_height = node.style.line_height.unwrap_or(size * 1.4);
        }
        if let Some(line_height) = node.style.line_height {
            style.line_height = line_height;
        }
        if let Some(weight) = node.style.font_weight {
            style.weight = weight;
        }
        if let Some(color) = node.style.color {
            style.color = color;
        }
        style.align = node.style.text_align;
    }
    style
}

fn draw_glyph(pixmap: &mut Pixmap, image: &SwashImage, x: i32, y: i32, color: Color) {
    let width = image.placement.width;
    let height = image.placement.height;
    if width == 0 || height == 0 {
        return;
    }
    let Some(mut glyph) = Pixmap::new(width, height) else {
        return;
    };
    {
        let pixels = glyph.pixels_mut();
        let count = (width as usize) * (height as usize);
        for (index, pixel) in pixels.iter_mut().enumerate().take(count) {
            let (r, g, b, alpha) = match image.content {
                SwashContent::Mask => {
                    let Some(alpha) = image.data.get(index).copied() else {
                        continue;
                    };
                    (color.r, color.g, color.b, alpha)
                }
                SwashContent::Color => {
                    let at = index * 4;
                    let (Some(r), Some(g), Some(b), Some(a)) = (
                        image.data.get(at).copied(),
                        image.data.get(at + 1).copied(),
                        image.data.get(at + 2).copied(),
                        image.data.get(at + 3).copied(),
                    ) else {
                        continue;
                    };
                    (r, g, b, a)
                }
                SwashContent::SubpixelMask => {
                    let at = index * 4;
                    let (Some(r), Some(g), Some(b)) = (
                        image.data.get(at).copied(),
                        image.data.get(at + 1).copied(),
                        image.data.get(at + 2).copied(),
                    ) else {
                        continue;
                    };
                    (color.r, color.g, color.b, r.max(g).max(b))
                }
            };
            let alpha = ((alpha as u16 * color.a as u16) / 255) as u8;
            if alpha == 0 {
                continue;
            }
            let premul_r = ((r as u16 * alpha as u16) / 255) as u8;
            let premul_g = ((g as u16 * alpha as u16) / 255) as u8;
            let premul_b = ((b as u16 * alpha as u16) / 255) as u8;
            if let Some(color) =
                PremultipliedColorU8::from_rgba(premul_r, premul_g, premul_b, alpha)
            {
                *pixel = color;
            }
        }
    }
    pixmap.draw_pixmap(
        x,
        y,
        glyph.as_ref(),
        &PixmapPaint::default(),
        Transform::identity(),
        None,
    );
}
