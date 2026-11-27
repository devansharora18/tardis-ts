// Software rasterizer.
//
// tiny-skia draws rectangles and glyph masks into an RGBA pixmap. v0 is the
// CPU backend: it works headlessly and needs no GPU. The renderer is clipped to
// the viewport and to every `overflow: hidden` view, and culls fully offscreen
// subtrees.

use std::cell::RefCell;
use std::collections::HashMap;

use base64::Engine as _;
use cosmic_text::{SwashContent, SwashImage};
use tiny_skia::{
    FillRule, Paint, Path, PathBuilder, Pixmap, PixmapPaint, PremultipliedColorU8, Rect as SkRect,
    Stroke, Transform,
};

use crate::layout::{ComputedLayout, Rect};
use crate::scene::{Color, NodeKind, Scene, TextAlign, TextOverflow, WhiteSpace};
use crate::text::TextEngine;

pub struct RenderOptions {
    /// Logical viewport width.
    pub width: u32,
    /// Logical viewport height.
    pub height: u32,
    /// Device pixel ratio. Layout stays logical; raster and clipping scale.
    pub scale: f32,
    pub background: Color,
}

struct ResolvedText {
    size: f32,
    line_height: f32,
    weight: u16,
    family: Option<String>,
    color: Color,
    align: TextAlign,
    overflow: TextOverflow,
    white_space: WhiteSpace,
}

#[derive(Debug, Clone, Copy)]
struct Clip {
    x0: f32,
    y0: f32,
    x1: f32,
    y1: f32,
}

impl Clip {
    fn viewport(width: f32, height: f32) -> Self {
        Self {
            x0: 0.0,
            y0: 0.0,
            x1: width,
            y1: height,
        }
    }

    fn is_empty(self) -> bool {
        self.x1 <= self.x0 || self.y1 <= self.y0
    }

    fn intersects(self, rect: Rect) -> bool {
        rect.x < self.x1
            && rect.y < self.y1
            && rect.x + rect.width > self.x0
            && rect.y + rect.height > self.y0
    }

    fn intersect(self, rect: Rect) -> Self {
        Self {
            x0: self.x0.max(rect.x),
            y0: self.y0.max(rect.y),
            x1: self.x1.min(rect.x + rect.width),
            y1: self.y1.min(rect.y + rect.height),
        }
    }

    fn contains(self, rect: Rect) -> bool {
        rect.x >= self.x0
            && rect.y >= self.y0
            && rect.x + rect.width <= self.x1
            && rect.y + rect.height <= self.y1
    }
}

pub fn render(
    scene: &Scene,
    layout: &ComputedLayout,
    text: &mut TextEngine,
    options: &RenderOptions,
) -> Result<Pixmap, String> {
    let scale = if options.scale > 0.0 {
        options.scale
    } else {
        1.0
    };
    let pixel_width = (options.width as f32 * scale).round().max(1.0) as u32;
    let pixel_height = (options.height as f32 * scale).round().max(1.0) as u32;
    let mut pixmap = Pixmap::new(pixel_width, pixel_height)
        .ok_or_else(|| "paint: invalid pixmap size".to_string())?;
    let background = SkRect::from_xywh(0.0, 0.0, pixel_width as f32, pixel_height as f32)
        .ok_or_else(|| "paint: invalid background rect".to_string())?;
    let mut paint = Paint::default();
    paint.set_color_rgba8(
        options.background.r,
        options.background.g,
        options.background.b,
        options.background.a,
    );
    pixmap.fill_rect(background, &paint, Transform::identity(), None);

    let clip = Clip::viewport(pixel_width as f32, pixel_height as f32);
    let root = scene
        .nodes
        .get(&scene.root)
        .ok_or_else(|| "paint: root node missing".to_string())?;
    for child in &root.children {
        draw_node(scene, layout, text, &mut pixmap, *child, 1.0, clip, scale);
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
    clip: Clip,
    scale: f32,
) {
    if clip.is_empty() {
        return;
    }
    let Some(node) = scene.nodes.get(&id) else {
        return;
    };
    let rect = scale_rect(layout.rects.get(&id).copied().unwrap_or_default(), scale);

    // Fragments have a zero rect at the origin; they must always recurse.
    if node.kind != NodeKind::Fragment && !clip.intersects(rect) {
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
                    clip,
                    scale,
                );
            }
        }
        NodeKind::View | NodeKind::Scroll => {
            if let Some(background) = node.style.background {
                draw_rect(
                    pixmap,
                    rect,
                    background.with_opacity(opacity),
                    node.style.border_radius * scale,
                    clip,
                );
            }
            if node.style.border_width > 0.0 {
                if let Some(border) = node.style.border_color {
                    draw_border(
                        pixmap,
                        rect,
                        border.with_opacity(opacity),
                        node.style.border_width * scale,
                        node.style.border_radius * scale,
                        clip,
                    );
                }
            }
            let child_clip = if node.style.overflow_hidden {
                clip.intersect(rect)
            } else {
                clip
            };
            for child in &node.children {
                draw_node(
                    scene, layout, text, pixmap, *child, opacity, child_clip, scale,
                );
            }
        }
        NodeKind::Text => {
            draw_text(
                scene, pixmap, text, node.id, &node.text, rect, opacity, clip, scale,
            );
        }
        NodeKind::Image => {
            draw_image(pixmap, rect, node.src.as_deref(), clip);
        }
    }
}

fn scale_rect(rect: Rect, scale: f32) -> Rect {
    Rect {
        x: rect.x * scale,
        y: rect.y * scale,
        width: rect.width * scale,
        height: rect.height * scale,
    }
}

type ImageCache = (HashMap<String, Option<Pixmap>>, Vec<String>);

thread_local! {
    static IMAGE_CACHE: RefCell<ImageCache> = RefCell::new((HashMap::new(), Vec::new()));
}

const IMAGE_CACHE_LIMIT: usize = 24;

fn load_image(src: &str) -> Option<Pixmap> {
    if let Some(encoded) = src.strip_prefix("data:image/png;base64,") {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(encoded)
            .ok()?;
        return Pixmap::decode_png(&bytes).ok();
    }
    Pixmap::load_png(src).ok()
}

fn draw_image(pixmap: &mut Pixmap, rect: Rect, src: Option<&str>, clip: Clip) {
    if rect.width <= 0.0 || rect.height <= 0.0 || !clip.contains(rect) {
        return;
    }
    let Some(src) = src else {
        draw_rect(
            pixmap,
            rect,
            Color::rgb(0x26, 0x26, 0x26),
            rect.width.min(rect.height) / 2.0,
            clip,
        );
        return;
    };
    IMAGE_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if !cache.0.contains_key(src) {
            if cache.1.len() >= IMAGE_CACHE_LIMIT {
                if let Some(old) = cache.1.first().cloned() {
                    cache.1.remove(0);
                    cache.0.remove(&old);
                }
            }
            cache.0.insert(src.to_string(), load_image(src));
            cache.1.push(src.to_string());
        }
        let image = cache.0.get(src);
        if let Some(Some(image)) = image {
            let sx = rect.width / image.width() as f32;
            let sy = rect.height / image.height() as f32;
            pixmap.draw_pixmap(
                rect.x as i32,
                rect.y as i32,
                image.as_ref(),
                &PixmapPaint::default(),
                Transform::from_scale(sx, sy),
                None,
            );
        } else {
            draw_rect(
                pixmap,
                rect,
                Color::rgb(0x26, 0x26, 0x26),
                rect.width.min(rect.height) / 2.0,
                clip,
            );
        }
    });
}

fn draw_rect(pixmap: &mut Pixmap, rect: Rect, color: Color, radius: f32, clip: Clip) {
    if rect.width <= 0.0 || rect.height <= 0.0 || color.a == 0 || clip.is_empty() {
        return;
    }
    let mut paint = Paint::default();
    paint.set_color_rgba8(color.r, color.g, color.b, color.a);
    paint.anti_alias = true;

    if radius > 0.5 && clip.contains(rect) {
        if let Some(path) = rounded_path(rect, radius) {
            pixmap.fill_path(
                &path,
                &paint,
                FillRule::Winding,
                Transform::identity(),
                None,
            );
        }
        return;
    }

    let x0 = rect.x.max(clip.x0);
    let y0 = rect.y.max(clip.y0);
    let x1 = (rect.x + rect.width).min(clip.x1);
    let y1 = (rect.y + rect.height).min(clip.y1);
    if x1 <= x0 || y1 <= y0 {
        return;
    }
    if let Some(sk_rect) = SkRect::from_xywh(x0, y0, x1 - x0, y1 - y0) {
        pixmap.fill_rect(sk_rect, &paint, Transform::identity(), None);
    }
}

fn draw_border(pixmap: &mut Pixmap, rect: Rect, color: Color, width: f32, radius: f32, clip: Clip) {
    let inset = width / 2.0;
    let inner = Rect {
        x: rect.x + inset,
        y: rect.y + inset,
        width: (rect.width - width).max(0.0),
        height: (rect.height - width).max(0.0),
    };
    if inner.width <= 0.0 || inner.height <= 0.0 || !clip.intersects(inner) {
        return;
    }
    let Some(path) = rounded_path(inner, (radius - inset).max(0.0)) else {
        return;
    };
    let mut paint = Paint::default();
    paint.set_color_rgba8(color.r, color.g, color.b, color.a);
    paint.anti_alias = true;
    let stroke = Stroke {
        width,
        ..Stroke::default()
    };
    pixmap.stroke_path(&path, &paint, &stroke, Transform::identity(), None);
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

#[allow(clippy::too_many_arguments)]
fn draw_text(
    scene: &Scene,
    pixmap: &mut Pixmap,
    text_engine: &mut TextEngine,
    node_id: u32,
    content: &str,
    rect: Rect,
    opacity: f32,
    clip: Clip,
    scale: f32,
) {
    if content.is_empty() || rect.width <= 0.0 || rect.height <= 0.0 || !clip.intersects(rect) {
        return;
    }
    let style = resolve_text_style(scene, node_id);
    let color = style.color.with_opacity(opacity);
    if let Some(background) = scene
        .nodes
        .get(&node_id)
        .and_then(|node| node.style.background)
    {
        draw_rect(
            pixmap,
            rect,
            background.with_opacity(opacity),
            scene
                .nodes
                .get(&node_id)
                .map(|node| node.style.border_radius * scale)
                .unwrap_or(0.0),
            clip,
        );
    }
    let content = if style.overflow == TextOverflow::Ellipsis {
        text_engine.ellipsize(
            content,
            style.size * scale,
            style.weight,
            style.family.as_deref(),
            rect.width,
        )
    } else {
        content.to_string()
    };
    // Taffy rounds measured widths to whole pixels. Shaping at exactly that
    // width can push the last glyph onto a hidden second line, which paints
    // below the node and clips the word. One pixel of slack prevents the
    // spurious wrap without changing the visible layout.
    let layout_width = if style.white_space == WhiteSpace::NoWrap {
        f32::MAX / 4.0
    } else {
        rect.width + 1.0
    };
    let buffer = text_engine.buffer(
        &content,
        style.size * scale,
        style.line_height * scale,
        style.weight,
        style.family.as_deref(),
        layout_width,
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
                    clip,
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
        family: None,
        color: Color::rgb(0xed, 0xed, 0xed),
        align: TextAlign::Left,
        overflow: TextOverflow::Clip,
        white_space: WhiteSpace::Normal,
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
        if let Some(family) = &node.style.font_family {
            style.family = Some(family.clone());
        }
        if let Some(color) = node.style.color {
            style.color = color;
        }
        style.overflow = node.style.text_overflow;
        style.white_space = node.style.white_space;
        style.align = node.style.text_align;
    }
    style
}

fn draw_glyph(pixmap: &mut Pixmap, image: &SwashImage, x: i32, y: i32, color: Color, clip: Clip) {
    let width = image.placement.width as i32;
    let height = image.placement.height as i32;
    if width <= 0 || height <= 0 {
        return;
    }
    let pixmap_width = pixmap.width() as i32;
    let pixmap_height = pixmap.height() as i32;
    let clip_x0 = clip.x0.floor() as i32;
    let clip_y0 = clip.y0.floor() as i32;
    let clip_x1 = clip.x1.ceil() as i32;
    let clip_y1 = clip.y1.ceil() as i32;
    if x + width <= clip_x0
        || y + height <= clip_y0
        || x >= clip_x1
        || y >= clip_y1
        || x + width <= 0
        || y + height <= 0
        || x >= pixmap_width
        || y >= pixmap_height
    {
        return;
    }

    let pixels = pixmap.pixels_mut();
    for row in 0..height {
        let py = y + row;
        if py < 0 || py >= pixmap_height || py < clip_y0 || py >= clip_y1 {
            continue;
        }
        for col in 0..width {
            let px = x + col;
            if px < 0 || px >= pixmap_width || px < clip_x0 || px >= clip_x1 {
                continue;
            }
            let index = (row as usize) * (width as usize) + (col as usize);
            let (r, g, b, coverage) = match image.content {
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
            let src_alpha = ((coverage as u16 * color.a as u16) / 255) as u8;
            if src_alpha == 0 {
                continue;
            }
            let pixel_index = (py as usize) * (pixmap_width as usize) + (px as usize);
            let dst = pixels[pixel_index];
            let inv = 255 - src_alpha;
            let out_a = src_alpha as u16 + (dst.alpha() as u16 * inv as u16) / 255;
            let out_r =
                ((r as u16 * src_alpha as u16) / 255) + (dst.red() as u16 * inv as u16) / 255;
            let out_g =
                ((g as u16 * src_alpha as u16) / 255) + (dst.green() as u16 * inv as u16) / 255;
            let out_b =
                ((b as u16 * src_alpha as u16) / 255) + (dst.blue() as u16 * inv as u16) / 255;
            if let Some(blended) = PremultipliedColorU8::from_rgba(
                out_r.min(255) as u8,
                out_g.min(255) as u8,
                out_b.min(255) as u8,
                out_a.min(255) as u8,
            ) {
                pixels[pixel_index] = blended;
            }
        }
    }
}
