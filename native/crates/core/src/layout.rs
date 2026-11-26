// Flexbox layout via taffy.
//
// Fragments are transparent: their children are attached to the nearest taffy
// parent. Text leaves are measured with cosmic-text through the measure
// callback.

use std::collections::HashMap;

use serde::Serialize;
use taffy::geometry::{Point, Rect as TaffyRect, Size};
use taffy::style::{
    AlignItems as TaffyAlign, Dimension, Display, FlexDirection as TaffyDirection,
    FlexWrap as TaffyWrap, JustifyContent as TaffyJustify, LengthPercentage,
    LengthPercentageAuto, Overflow, Position as TaffyPosition, Style as TaffyStyle,
};
use taffy::{AvailableSpace, NodeId, TaffyTree};

use crate::scene::{
    AlignItems, FlexDirection, FlexWrap, JustifyContent, NodeKind, Position, Scene, Style,
};
use crate::text::TextEngine;

#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone)]
pub struct ComputedLayout {
    pub rects: HashMap<u32, Rect>,
    pub width: f32,
    pub height: f32,
}

pub fn layout_scene(
    scene: &Scene,
    text: &mut TextEngine,
    width: f32,
    height: f32,
) -> Result<ComputedLayout, String> {
    let mut tree: TaffyTree<u32> = TaffyTree::new();
    let mut mapped: HashMap<u32, NodeId> = HashMap::new();

    let mut children = Vec::new();
    if let Some(root) = scene.nodes.get(&scene.root) {
        for child in &root.children {
            children.extend(build(&mut tree, scene, *child, &mut mapped)?);
        }
    }

    let root_style = TaffyStyle {
        size: Size {
            width: Dimension::Length(width),
            height: Dimension::Length(height),
        },
        display: Display::Flex,
        flex_direction: TaffyDirection::Column,
        align_items: Some(TaffyAlign::Stretch),
        ..Default::default()
    };
    let root = if children.is_empty() {
        tree.new_leaf(root_style)
    } else {
        tree.new_with_children(root_style, &children)
    }
    .map_err(|err| err.to_string())?;

    let available = Size {
        width: AvailableSpace::Definite(width),
        height: AvailableSpace::Definite(height),
    };
    tree.compute_layout_with_measure(
        root,
        available,
        |known, available, _node, context, _style| {
            let Some(context) = context else {
                return Size {
                    width: known.width.unwrap_or(0.0),
                    height: known.height.unwrap_or(0.0),
                };
            };
            let scene_id = *context;
            let node = match scene.nodes.get(&scene_id) {
                Some(node) => node,
                None => {
                    return Size {
                        width: known.width.unwrap_or(0.0),
                        height: known.height.unwrap_or(0.0),
                    }
                }
            };
            if node.kind != NodeKind::Text {
                return Size {
                    width: known.width.unwrap_or(0.0),
                    height: known.height.unwrap_or(0.0),
                };
            }
            let max_width = known.width.or(match available.width {
                AvailableSpace::Definite(value) => Some(value),
                _ => None,
            });
            let (measured_width, measured_height) =
                text.measure(&node.text, &node.style, max_width);
            Size {
                width: known.width.unwrap_or(measured_width),
                height: known.height.unwrap_or(measured_height),
            }
        },
    )
    .map_err(|err| err.to_string())?;

    let mut rects = HashMap::new();
    rects.insert(
        scene.root,
        Rect {
            x: 0.0,
            y: 0.0,
            width,
            height,
        },
    );
    collect_rects(scene, &tree, &mapped, scene.root, 0.0, 0.0, &mut rects)?;

    Ok(ComputedLayout {
        rects,
        width,
        height,
    })
}

fn build(
    tree: &mut TaffyTree<u32>,
    scene: &Scene,
    id: u32,
    mapped: &mut HashMap<u32, NodeId>,
) -> Result<Vec<NodeId>, String> {
    let node = scene
        .nodes
        .get(&id)
        .ok_or_else(|| format!("layout: node {id} does not exist"))?;

    match node.kind {
        NodeKind::Fragment => {
            let mut out = Vec::new();
            for child in &node.children {
                out.extend(build(tree, scene, *child, mapped)?);
            }
            Ok(out)
        }
        NodeKind::View | NodeKind::Scroll => {
            let mut children = Vec::new();
            for child in &node.children {
                children.extend(build(tree, scene, *child, mapped)?);
            }
            let style = to_taffy(&node.style);
            let taffy_id = if children.is_empty() {
                tree.new_leaf(style)
            } else {
                tree.new_with_children(style, &children)
            }
            .map_err(|err| err.to_string())?;
            mapped.insert(id, taffy_id);
            Ok(vec![taffy_id])
        }
        NodeKind::Text | NodeKind::Image => {
            let taffy_id = tree
                .new_leaf_with_context(to_taffy(&node.style), id)
                .map_err(|err| err.to_string())?;
            mapped.insert(id, taffy_id);
            Ok(vec![taffy_id])
        }
    }
}

fn collect_rects(
    scene: &Scene,
    tree: &TaffyTree<u32>,
    mapped: &HashMap<u32, NodeId>,
    id: u32,
    origin_x: f32,
    origin_y: f32,
    rects: &mut HashMap<u32, Rect>,
) -> Result<(), String> {
    let node = scene
        .nodes
        .get(&id)
        .ok_or_else(|| format!("layout: node {id} does not exist"))?;
    for child_id in &node.children {
        let child = scene
            .nodes
            .get(child_id)
            .ok_or_else(|| format!("layout: node {child_id} does not exist"))?;
        if child.kind == NodeKind::Fragment {
            rects.insert(
                *child_id,
                Rect {
                    x: origin_x,
                    y: origin_y,
                    width: 0.0,
                    height: 0.0,
                },
            );
            collect_rects(scene, tree, mapped, *child_id, origin_x, origin_y, rects)?;
            continue;
        }
        let Some(taffy_id) = mapped.get(child_id) else {
            continue;
        };
        let layout = tree.layout(*taffy_id).map_err(|err| err.to_string())?;
        let x = origin_x + layout.location.x;
        let y = origin_y + layout.location.y;
        rects.insert(
            *child_id,
            Rect {
                x,
                y,
                width: layout.size.width,
                height: layout.size.height,
            },
        );
        collect_rects(scene, tree, mapped, *child_id, x, y, rects)?;
    }
    Ok(())
}

fn dimension(value: Option<f32>) -> Dimension {
    match value {
        Some(value) => Dimension::Length(value.max(0.0)),
        None => Dimension::Auto,
    }
}

fn to_taffy(style: &Style) -> TaffyStyle {
    let mut out = TaffyStyle::default();
    out.display = if style.display {
        Display::Flex
    } else {
        Display::None
    };
    out.size = Size {
        width: dimension(style.width),
        height: dimension(style.height),
    };
    out.min_size = Size {
        width: dimension(style.min_width),
        height: dimension(style.min_height),
    };
    out.max_size = Size {
        width: dimension(style.max_width),
        height: dimension(style.max_height),
    };
    out.padding = TaffyRect {
        left: LengthPercentage::Length(style.padding.left),
        right: LengthPercentage::Length(style.padding.right),
        top: LengthPercentage::Length(style.padding.top),
        bottom: LengthPercentage::Length(style.padding.bottom),
    };
    out.margin = TaffyRect {
        left: LengthPercentageAuto::Length(style.margin.left),
        right: LengthPercentageAuto::Length(style.margin.right),
        top: LengthPercentageAuto::Length(style.margin.top),
        bottom: LengthPercentageAuto::Length(style.margin.bottom),
    };
    out.inset = TaffyRect {
        left: LengthPercentageAuto::Length(style.inset.left),
        right: LengthPercentageAuto::Length(style.inset.right),
        top: LengthPercentageAuto::Length(style.inset.top),
        bottom: LengthPercentageAuto::Length(style.inset.bottom),
    };
    out.gap = Size {
        width: LengthPercentage::Length(style.gap),
        height: LengthPercentage::Length(style.gap),
    };
    out.flex_direction = match style.flex_direction {
        FlexDirection::Column => TaffyDirection::Column,
        FlexDirection::Row => TaffyDirection::Row,
        FlexDirection::ColumnReverse => TaffyDirection::ColumnReverse,
        FlexDirection::RowReverse => TaffyDirection::RowReverse,
    };
    out.justify_content = Some(match style.justify_content {
        JustifyContent::Start => TaffyJustify::Start,
        JustifyContent::End => TaffyJustify::End,
        JustifyContent::Center => TaffyJustify::Center,
        JustifyContent::SpaceBetween => TaffyJustify::SpaceBetween,
        JustifyContent::SpaceAround => TaffyJustify::SpaceAround,
        JustifyContent::SpaceEvenly => TaffyJustify::SpaceEvenly,
    });
    out.align_items = Some(match style.align_items {
        AlignItems::Stretch => TaffyAlign::Stretch,
        AlignItems::Start => TaffyAlign::Start,
        AlignItems::End => TaffyAlign::End,
        AlignItems::Center => TaffyAlign::Center,
        AlignItems::Baseline => TaffyAlign::Baseline,
    });
    out.flex_wrap = match style.flex_wrap {
        FlexWrap::NoWrap => TaffyWrap::NoWrap,
        FlexWrap::Wrap => TaffyWrap::Wrap,
        FlexWrap::WrapReverse => TaffyWrap::WrapReverse,
    };
    out.flex_grow = style.flex_grow;
    out.flex_shrink = style.flex_shrink;
    out.position = match style.position {
        Position::Relative => TaffyPosition::Relative,
        Position::Absolute => TaffyPosition::Absolute,
    };
    out.overflow = Point {
        x: if style.overflow_hidden {
            Overflow::Hidden
        } else {
            Overflow::Visible
        },
        y: if style.overflow_hidden {
            Overflow::Hidden
        } else {
            Overflow::Visible
        },
    };
    out
}

#[derive(Debug, Serialize)]
pub struct SceneDump {
    pub width: f32,
    pub height: f32,
    pub nodes: Vec<NodeDump>,
}

#[derive(Debug, Serialize)]
pub struct NodeDump {
    pub id: u32,
    pub kind: &'static str,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub text: Option<String>,
    pub children: Vec<u32>,
}

pub fn dump_scene(scene: &Scene, layout: &ComputedLayout) -> SceneDump {
    let mut nodes = Vec::new();
    walk(scene, layout, scene.root, &mut nodes);
    SceneDump {
        width: layout.width,
        height: layout.height,
        nodes,
    }
}

fn walk(scene: &Scene, layout: &ComputedLayout, id: u32, out: &mut Vec<NodeDump>) {
    let Some(node) = scene.nodes.get(&id) else {
        return;
    };
    let rect = layout.rects.get(&id).copied().unwrap_or_default();
    out.push(NodeDump {
        id,
        kind: node.kind.as_str(),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        text: if node.kind == NodeKind::Text {
            Some(node.text.clone())
        } else {
            None
        },
        children: node.children.clone(),
    });
    for child in &node.children {
        walk(scene, layout, *child, out);
    }
}
