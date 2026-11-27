// Text shaping and measurement. Both bundled fonts are loaded explicitly so a
// machine without system fonts still produces identical output.

use cosmic_text::{Attrs, Buffer, Family, FontSystem, Metrics, Shaping, SwashCache, Weight};

use crate::scene::Style;

const REGULAR: &[u8] = include_bytes!("../assets/LiberationSans-Regular.ttf");
const BOLD: &[u8] = include_bytes!("../assets/LiberationSans-Bold.ttf");
const MONO_REGULAR: &[u8] = include_bytes!("../assets/JetBrainsMono-Regular.ttf");
const MONO_BOLD: &[u8] = include_bytes!("../assets/JetBrainsMono-Bold.ttf");
const SERIF: &[u8] = include_bytes!("../assets/LiberationSerif-Regular.ttf");
const SERIF_BOLD: &[u8] = include_bytes!("../assets/LiberationSerif-Bold.ttf");
const FAMILY: &str = "Liberation Sans";
const MONO_FAMILY: &str = "JetBrains Mono";
const SERIF_FAMILY: &str = "Liberation Serif";

pub struct TextEngine {
    pub font_system: FontSystem,
    pub swash_cache: SwashCache,
}

impl TextEngine {
    pub fn new() -> Self {
        let mut font_system = FontSystem::new();
        font_system.db_mut().load_font_data(REGULAR.to_vec());
        font_system.db_mut().load_font_data(BOLD.to_vec());
        font_system.db_mut().load_font_data(MONO_REGULAR.to_vec());
        font_system.db_mut().load_font_data(MONO_BOLD.to_vec());
        font_system.db_mut().load_font_data(SERIF.to_vec());
        font_system.db_mut().load_font_data(SERIF_BOLD.to_vec());
        Self {
            font_system,
            swash_cache: SwashCache::new(),
        }
    }

    pub fn measure(&mut self, text: &str, style: &Style, max_width: Option<f32>) -> (f32, f32) {
        let size = style.font_size.unwrap_or(16.0);
        let line_height = style.line_height.unwrap_or(size * 1.4);
        let weight = style.font_weight.unwrap_or(400);
        let family = style.font_family.as_deref();
        let mut buffer = Buffer::new(&mut self.font_system, Metrics::new(size, line_height));
        let limit = match style.white_space {
            crate::scene::WhiteSpace::NoWrap => None,
            crate::scene::WhiteSpace::Normal => max_width.filter(|width| *width > 0.0),
        };
        buffer.set_size(&mut self.font_system, limit, None);
        buffer.set_text(
            &mut self.font_system,
            text,
            attrs(weight, family),
            Shaping::Advanced,
        );

        let mut width: f32 = 0.0;
        let mut height: f32 = line_height;
        for run in buffer.layout_runs() {
            width = width.max(run.line_w);
            height = height.max(run.line_top + run.line_height);
        }
        (width, height)
    }

    /// Truncate the first line to `max_width`, appending an ellipsis.
    pub fn ellipsize(
        &mut self,
        text: &str,
        size: f32,
        weight: u16,
        family: Option<&str>,
        max_width: f32,
    ) -> String {
        let line = text.lines().next().unwrap_or("");
        if max_width <= 0.0 {
            return String::new();
        }
        if self.line_width(line, size, weight, family) <= max_width {
            return line.to_string();
        }
        let chars: Vec<char> = line.chars().collect();
        let mut low = 0usize;
        let mut high = chars.len();
        while low < high {
            let mid = (low + high).div_ceil(2);
            let mut candidate: String = chars[..mid].iter().collect();
            candidate.push('\u{2026}');
            if self.line_width(&candidate, size, weight, family) <= max_width {
                low = mid;
            } else {
                high = mid - 1;
            }
        }
        let mut result: String = chars[..low].iter().collect();
        result.push('\u{2026}');
        result
    }

    fn line_width(&mut self, text: &str, size: f32, weight: u16, family: Option<&str>) -> f32 {
        let mut buffer = Buffer::new(&mut self.font_system, Metrics::new(size, size * 1.4));
        buffer.set_size(&mut self.font_system, Some(f32::MAX / 4.0), None);
        buffer.set_text(
            &mut self.font_system,
            text,
            attrs(weight, family),
            Shaping::Advanced,
        );
        buffer
            .layout_runs()
            .map(|run| run.line_w)
            .fold(0.0, f32::max)
    }

    pub fn buffer(
        &mut self,
        text: &str,
        size: f32,
        line_height: f32,
        weight: u16,
        family: Option<&str>,
        width: f32,
    ) -> Buffer {
        let mut buffer = Buffer::new(&mut self.font_system, Metrics::new(size, line_height));
        buffer.set_size(&mut self.font_system, Some(width.max(1.0)), None);
        buffer.set_text(
            &mut self.font_system,
            text,
            attrs(weight, family),
            Shaping::Advanced,
        );
        buffer
    }
}

impl Default for TextEngine {
    fn default() -> Self {
        Self::new()
    }
}

fn attrs(weight: u16, family: Option<&str>) -> Attrs<'static> {
    let family = match family {
        Some("monospace") | Some("JetBrains Mono") => MONO_FAMILY,
        Some("serif") | Some("Liberation Serif") => SERIF_FAMILY,
        _ => FAMILY,
    };
    Attrs::new()
        .family(Family::Name(family))
        .weight(if weight >= 600 {
            Weight::BOLD
        } else {
            Weight::NORMAL
        })
}
