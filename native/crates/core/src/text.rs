// Text shaping and measurement. Both bundled fonts are loaded explicitly so a
// machine without system fonts still produces identical output.

use cosmic_text::{
    Attrs, Buffer, Family, FontSystem, Metrics, Shaping, SwashCache, Weight,
};

use crate::scene::Style;

const REGULAR: &[u8] = include_bytes!("../assets/LiberationSans-Regular.ttf");
const BOLD: &[u8] = include_bytes!("../assets/LiberationSans-Bold.ttf");
const FAMILY: &str = "Liberation Sans";

pub struct TextEngine {
    pub font_system: FontSystem,
    pub swash_cache: SwashCache,
}

impl TextEngine {
    pub fn new() -> Self {
        let mut font_system = FontSystem::new();
        font_system.db_mut().load_font_data(REGULAR.to_vec());
        font_system.db_mut().load_font_data(BOLD.to_vec());
        Self {
            font_system,
            swash_cache: SwashCache::new(),
        }
    }

    pub fn measure(&mut self, text: &str, style: &Style, max_width: Option<f32>) -> (f32, f32) {
        let size = style.font_size.unwrap_or(16.0);
        let line_height = style.line_height.unwrap_or(size * 1.4);
        let weight = style.font_weight.unwrap_or(400);
        let mut buffer = Buffer::new(&mut self.font_system, Metrics::new(size, line_height));
        buffer.set_size(
            &mut self.font_system,
            max_width.filter(|width| *width > 0.0),
            None,
        );
        buffer.set_text(
            &mut self.font_system,
            text,
            attrs(weight),
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

    pub fn buffer(
        &mut self,
        text: &str,
        size: f32,
        line_height: f32,
        weight: u16,
        width: f32,
    ) -> Buffer {
        let mut buffer = Buffer::new(
            &mut self.font_system,
            Metrics::new(size, line_height),
        );
        buffer.set_size(&mut self.font_system, Some(width.max(1.0)), None);
        buffer.set_text(
            &mut self.font_system,
            text,
            attrs(weight),
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

fn attrs(weight: u16) -> Attrs<'static> {
    Attrs::new()
        .family(Family::Name(FAMILY))
        .weight(if weight >= 600 { Weight::BOLD } else { Weight::NORMAL })
}
