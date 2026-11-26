// Scene graph and typed styles.
//
// The JS runtime sends string-keyed patches; this module is the only place
// those keys are parsed. Unknown keys are ignored so a newer runtime can talk
// to an older core without crashing.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeKind {
    View,
    Text,
    Image,
    Scroll,
    Fragment,
}

impl NodeKind {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "view" => Some(Self::View),
            "text" => Some(Self::Text),
            "image" => Some(Self::Image),
            "scroll" => Some(Self::Scroll),
            "fragment" => Some(Self::Fragment),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::View => "view",
            Self::Text => "text",
            Self::Image => "image",
            Self::Scroll => "scroll",
            Self::Fragment => "fragment",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

impl Color {
    pub const fn rgb(r: u8, g: u8, b: u8) -> Self {
        Self { r, g, b, a: 255 }
    }

    pub fn parse(value: &str) -> Option<Self> {
        let hex = value.strip_prefix('#')?;
        match hex.len() {
            3 => {
                let r = u8::from_str_radix(&hex[0..1], 16).ok()? * 17;
                let g = u8::from_str_radix(&hex[1..2], 16).ok()? * 17;
                let b = u8::from_str_radix(&hex[2..3], 16).ok()? * 17;
                Some(Self::rgb(r, g, b))
            }
            6 => {
                let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
                let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
                let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
                Some(Self::rgb(r, g, b))
            }
            8 => {
                let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
                let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
                let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
                let a = u8::from_str_radix(&hex[6..8], 16).ok()?;
                Some(Self { r, g, b, a })
            }
            _ => None,
        }
    }

    pub fn with_opacity(self, opacity: f32) -> Self {
        Self {
            a: ((self.a as f32) * opacity.clamp(0.0, 1.0)) as u8,
            ..self
        }
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum FlexDirection {
    #[default]
    Column,
    Row,
    ColumnReverse,
    RowReverse,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum JustifyContent {
    #[default]
    Start,
    End,
    Center,
    SpaceBetween,
    SpaceAround,
    SpaceEvenly,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum AlignItems {
    #[default]
    Stretch,
    Start,
    End,
    Center,
    Baseline,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum FlexWrap {
    #[default]
    NoWrap,
    Wrap,
    WrapReverse,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum Position {
    #[default]
    Relative,
    Absolute,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum TextAlign {
    #[default]
    Left,
    Center,
    Right,
}

#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct Edges {
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
    pub left: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Style {
    pub display: bool,
    pub width: Option<f32>,
    pub height: Option<f32>,
    pub min_width: Option<f32>,
    pub max_width: Option<f32>,
    pub min_height: Option<f32>,
    pub max_height: Option<f32>,
    pub padding: Edges,
    pub margin: Edges,
    pub flex_direction: FlexDirection,
    pub justify_content: JustifyContent,
    pub align_items: AlignItems,
    pub gap: f32,
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub flex_wrap: FlexWrap,
    pub position: Position,
    pub inset: Edges,
    pub background: Option<Color>,
    pub border_radius: f32,
    pub opacity: f32,
    pub overflow_hidden: bool,
    pub font_size: Option<f32>,
    pub font_weight: Option<u16>,
    pub color: Option<Color>,
    pub line_height: Option<f32>,
    pub text_align: TextAlign,
}

impl Default for Style {
    fn default() -> Self {
        Self {
            display: true,
            width: None,
            height: None,
            min_width: None,
            max_width: None,
            min_height: None,
            max_height: None,
            padding: Edges::default(),
            margin: Edges::default(),
            flex_direction: FlexDirection::Column,
            justify_content: JustifyContent::Start,
            align_items: AlignItems::Stretch,
            gap: 0.0,
            flex_grow: 0.0,
            flex_shrink: 1.0,
            flex_wrap: FlexWrap::NoWrap,
            position: Position::Relative,
            inset: Edges::default(),
            background: None,
            border_radius: 0.0,
            opacity: 1.0,
            overflow_hidden: false,
            font_size: None,
            font_weight: None,
            color: None,
            line_height: None,
            text_align: TextAlign::Left,
        }
    }
}

impl Style {
    pub fn set(&mut self, key: &str, value: &Value) -> Result<(), String> {
        let number = || value.as_f64().map(|v| v as f32);
        let string = || value.as_str();
        let clear = value.is_null();

        match key {
            "width" => self.width = number(),
            "height" => self.height = number(),
            "minWidth" => self.min_width = number(),
            "maxWidth" => self.max_width = number(),
            "minHeight" => self.min_height = number(),
            "maxHeight" => self.max_height = number(),
            "padding" => {
                if clear {
                    self.padding = Edges::default();
                } else {
                    let v = number().ok_or_else(|| "padding must be a number".to_string())?;
                    let v = v.max(0.0);
                    self.padding = Edges {
                        top: v,
                        right: v,
                        bottom: v,
                        left: v,
                    };
                }
            }
            "paddingTop" => set_edge(&mut self.padding.top, value, clear, false)?,
            "paddingRight" => set_edge(&mut self.padding.right, value, clear, false)?,
            "paddingBottom" => set_edge(&mut self.padding.bottom, value, clear, false)?,
            "paddingLeft" => set_edge(&mut self.padding.left, value, clear, false)?,
            "margin" => {
                if clear {
                    self.margin = Edges::default();
                } else {
                    let v = number().ok_or_else(|| "margin must be a number".to_string())?;
                    self.margin = Edges {
                        top: v,
                        right: v,
                        bottom: v,
                        left: v,
                    };
                }
            }
            "marginTop" => set_signed_edge(&mut self.margin.top, value, clear)?,
            "marginRight" => set_signed_edge(&mut self.margin.right, value, clear)?,
            "marginBottom" => set_signed_edge(&mut self.margin.bottom, value, clear)?,
            "marginLeft" => set_signed_edge(&mut self.margin.left, value, clear)?,
            "flexDirection" => {
                self.flex_direction = match string() {
                    Some("row") => FlexDirection::Row,
                    Some("row-reverse") => FlexDirection::RowReverse,
                    Some("column-reverse") => FlexDirection::ColumnReverse,
                    Some("column") | None => FlexDirection::Column,
                    Some(other) => return Err(format!("unknown flexDirection: {other}")),
                }
            }
            "justifyContent" => {
                self.justify_content = match string() {
                    Some("flex-start") | Some("start") | None => JustifyContent::Start,
                    Some("flex-end") | Some("end") => JustifyContent::End,
                    Some("center") => JustifyContent::Center,
                    Some("space-between") => JustifyContent::SpaceBetween,
                    Some("space-around") => JustifyContent::SpaceAround,
                    Some("space-evenly") => JustifyContent::SpaceEvenly,
                    Some(other) => return Err(format!("unknown justifyContent: {other}")),
                }
            }
            "alignItems" => {
                self.align_items = match string() {
                    Some("stretch") | None => AlignItems::Stretch,
                    Some("flex-start") | Some("start") => AlignItems::Start,
                    Some("flex-end") | Some("end") => AlignItems::End,
                    Some("center") => AlignItems::Center,
                    Some("baseline") => AlignItems::Baseline,
                    Some(other) => return Err(format!("unknown alignItems: {other}")),
                }
            }
            "gap" => self.gap = number().unwrap_or(0.0).max(0.0),
            "flexGrow" => self.flex_grow = number().unwrap_or(0.0).max(0.0),
            "flexShrink" => self.flex_shrink = number().unwrap_or(1.0).max(0.0),
            "flexWrap" => {
                self.flex_wrap = match string() {
                    Some("wrap") => FlexWrap::Wrap,
                    Some("wrap-reverse") => FlexWrap::WrapReverse,
                    Some("nowrap") | None => FlexWrap::NoWrap,
                    Some(other) => return Err(format!("unknown flexWrap: {other}")),
                }
            }
            "backgroundColor" => {
                self.background = if clear {
                    None
                } else {
                    Some(
                        Color::parse(string().ok_or("backgroundColor must be a string")?)
                            .ok_or_else(|| "invalid backgroundColor".to_string())?,
                    )
                }
            }
            "color" => {
                self.color = if clear {
                    None
                } else {
                    Some(
                        Color::parse(string().ok_or("color must be a string")?)
                            .ok_or_else(|| "invalid color".to_string())?,
                    )
                }
            }
            "borderRadius" => self.border_radius = number().unwrap_or(0.0).max(0.0),
            "opacity" => self.opacity = number().unwrap_or(1.0).clamp(0.0, 1.0),
            "overflow" => {
                self.overflow_hidden =
                    matches!(string(), Some("hidden") | Some("scroll") | Some("auto"))
            }
            "fontSize" => self.font_size = number().filter(|v| *v > 0.0),
            "fontWeight" => self.font_weight = number().map(|v| v as u16),
            "lineHeight" => self.line_height = number().filter(|v| *v > 0.0),
            "textAlign" => {
                self.text_align = match string() {
                    Some("center") => TextAlign::Center,
                    Some("right") => TextAlign::Right,
                    Some("left") | None => TextAlign::Left,
                    Some(other) => return Err(format!("unknown textAlign: {other}")),
                }
            }
            "display" => self.display = !matches!(string(), Some("none")),
            "position" => {
                self.position = match string() {
                    Some("absolute") => Position::Absolute,
                    Some("relative") | None => Position::Relative,
                    Some(other) => return Err(format!("unknown position: {other}")),
                }
            }
            "top" => set_signed_edge(&mut self.inset.top, value, clear)?,
            "right" => set_signed_edge(&mut self.inset.right, value, clear)?,
            "bottom" => set_signed_edge(&mut self.inset.bottom, value, clear)?,
            "left" => set_signed_edge(&mut self.inset.left, value, clear)?,
            _ => {}
        }
        Ok(())
    }
}

fn set_edge(target: &mut f32, value: &Value, clear: bool, signed: bool) -> Result<(), String> {
    if clear {
        *target = 0.0;
        return Ok(());
    }
    let n = value
        .as_f64()
        .map(|v| v as f32)
        .ok_or_else(|| "edge must be a number".to_string())?;
    *target = if signed { n } else { n.max(0.0) };
    Ok(())
}

fn set_signed_edge(target: &mut f32, value: &Value, clear: bool) -> Result<(), String> {
    set_edge(target, value, clear, true)
}

#[derive(Debug, Clone)]
pub struct Node {
    pub id: u32,
    pub kind: NodeKind,
    pub parent: Option<u32>,
    pub children: Vec<u32>,
    pub style: Style,
    pub text: String,
    pub src: Option<String>,
    pub scroll: (f32, f32),
    /// Accessibility attributes from the JS runtime. Stored for a future
    /// accesskit tree; the v0 renderer does not read them.
    pub a11y: serde_json::Map<String, Value>,
}

impl Node {
    pub fn new(id: u32, kind: NodeKind) -> Self {
        Self {
            id,
            kind,
            parent: None,
            children: Vec::new(),
            style: Style::default(),
            text: String::new(),
            src: None,
            scroll: (0.0, 0.0),
            a11y: serde_json::Map::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Scene {
    pub nodes: HashMap<u32, Node>,
    pub root: u32,
}

impl Default for Scene {
    fn default() -> Self {
        Self::new()
    }
}

impl Scene {
    pub fn new() -> Self {
        let root = Node::new(0, NodeKind::Fragment);
        let mut nodes = HashMap::new();
        nodes.insert(0, root);
        Self { nodes, root: 0 }
    }

    pub fn node(&self, id: u32) -> Option<&Node> {
        self.nodes.get(&id)
    }

    pub fn node_mut(&mut self, id: u32) -> Option<&mut Node> {
        self.nodes.get_mut(&id)
    }

    pub fn descendants(&self, id: u32) -> Vec<u32> {
        let mut out = Vec::new();
        let mut stack = vec![id];
        while let Some(current) = stack.pop() {
            if let Some(node) = self.nodes.get(&current) {
                for child in &node.children {
                    out.push(*child);
                    stack.push(*child);
                }
            }
        }
        out
    }
}
