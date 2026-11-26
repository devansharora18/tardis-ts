// Tardis native core: scene, patch decoding, flexbox layout, text, raster.

pub mod layout;
pub mod paint;
pub mod patch;
pub mod scene;
pub mod text;

pub use layout::{dump_scene, layout_scene, ComputedLayout, NodeDump, Rect, SceneDump};
pub use paint::{render, render_to_png, RenderOptions};
pub use patch::{apply_patch, Op, Patch};
pub use scene::{Color, Node, NodeKind, Scene, Style};
pub use text::TextEngine;

pub struct Engine {
    pub scene: Scene,
    pub text: TextEngine,
    pub layout: Option<ComputedLayout>,
    pub width: f32,
    pub height: f32,
}

impl Engine {
    pub fn new(width: f32, height: f32) -> Self {
        Self {
            scene: Scene::new(),
            text: TextEngine::new(),
            layout: None,
            width,
            height,
        }
    }

    pub fn apply(&mut self, patch: Patch) -> Result<(), String> {
        apply_patch(&mut self.scene, patch)?;
        self.relayout()
    }

    pub fn apply_json(&mut self, json: &str) -> Result<(), String> {
        let patch: Patch =
            serde_json::from_str(json).map_err(|err| format!("patch decode: {err}"))?;
        self.apply(patch)
    }

    pub fn relayout(&mut self) -> Result<(), String> {
        self.layout = Some(layout_scene(
            &self.scene,
            &mut self.text,
            self.width,
            self.height,
        )?);
        Ok(())
    }

    pub fn render_png(&mut self, path: &str) -> Result<(), String> {
        let Self {
            scene,
            text,
            layout,
            width,
            height,
        } = self;
        let layout = layout
            .as_ref()
            .ok_or_else(|| "engine: layout not computed".to_string())?;
        render_to_png(
            scene,
            layout,
            text,
            path,
            &RenderOptions {
                width: *width as u32,
                height: *height as u32,
                background: Color::rgb(0x0a, 0x0a, 0x0a),
            },
        )
    }

    pub fn dump(&self) -> Result<SceneDump, String> {
        let layout = self
            .layout
            .as_ref()
            .ok_or_else(|| "engine: layout not computed".to_string())?;
        Ok(dump_scene(&self.scene, layout))
    }
}
