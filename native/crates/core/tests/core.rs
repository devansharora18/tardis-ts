use std::fs;

use tardis_core::Engine;
use tiny_skia::Pixmap;

fn apply(engine: &mut Engine, ops: &str) {
    let json = format!(r##"{{"v":0,"frame":1,"ops":{ops}}}"##);
    engine
        .apply_json(&json)
        .unwrap_or_else(|err| panic!("patch failed: {err}"));
}

fn sample() -> Engine {
    let mut engine = Engine::new(400.0, 300.0);
    apply(
        &mut engine,
        r##"[
          {"op":"create","id":1,"kind":"view","parent":0,"index":0},
          {"op":"style","id":1,"props":{"padding":20,"backgroundColor":"#ff0000"}},
          {"op":"create","id":2,"kind":"text","parent":1,"index":0},
          {"op":"text","id":2,"value":"Hello"},
          {"op":"style","id":2,"props":{"fontSize":24,"color":"#ffffff"}}
        ]"##,
    );
    engine
}

#[test]
fn layout_stretches_column_children_and_applies_padding() {
    let engine = sample();
    let dump = engine.dump().unwrap();
    let view = dump.nodes.iter().find(|node| node.id == 1).unwrap();
    assert_eq!(view.width, 400.0);
    assert!(view.height > 50.0, "height was {}", view.height);

    let text = dump.nodes.iter().find(|node| node.id == 2).unwrap();
    assert_eq!(text.x, 20.0);
    assert_eq!(text.y, 20.0);
    assert!(text.width > 30.0 && text.width <= 360.0);
}

#[test]
fn text_measure_wraps_at_the_available_width() {
    let mut engine = Engine::new(120.0, 400.0);
    apply(
        &mut engine,
        r##"[
          {"op":"create","id":1,"kind":"text","parent":0,"index":0},
          {"op":"text","id":1,"value":"hello world hello world hello world"},
          {"op":"style","id":1,"props":{"fontSize":18}}
        ]"##,
    );
    let dump = engine.dump().unwrap();
    let text = dump.nodes.iter().find(|node| node.id == 1).unwrap();
    assert_eq!(text.width, 120.0);
    assert!(
        text.height > 30.0,
        "expected wrapped lines, got {}",
        text.height
    );
}

#[test]
fn fragments_are_transparent_to_layout() {
    let mut engine = Engine::new(300.0, 200.0);
    apply(
        &mut engine,
        r##"[
          {"op":"create","id":1,"kind":"view","parent":0,"index":0},
          {"op":"style","id":1,"props":{"padding":10}},
          {"op":"create","id":2,"kind":"fragment","parent":1,"index":0},
          {"op":"create","id":3,"kind":"text","parent":2,"index":0},
          {"op":"text","id":3,"value":"inside"},
          {"op":"style","id":3,"props":{"fontSize":20}}
        ]"##,
    );
    let dump = engine.dump().unwrap();
    let text = dump.nodes.iter().find(|node| node.id == 3).unwrap();
    assert_eq!(text.x, 10.0);
    assert_eq!(text.y, 10.0);
    assert!(text.height > 20.0);
}

#[test]
fn invalid_patch_leaves_the_scene_untouched() {
    let mut engine = sample();
    let before = engine.scene.nodes.len();
    let result = engine.apply_json(
        r##"{"v":0,"frame":2,"ops":[
          {"op":"create","id":9,"kind":"view","parent":777,"index":0}
        ]}"##,
    );
    assert!(result.is_err());
    assert_eq!(engine.scene.nodes.len(), before);
}

#[test]
fn destroy_removes_the_subtree() {
    let mut engine = sample();
    apply(
        &mut engine,
        r##"[
          {"op":"destroy","id":1}
        ]"##,
    );
    assert_eq!(engine.scene.nodes.len(), 1);
    assert!(engine.scene.nodes.contains_key(&0));
}

#[test]
fn renders_a_png_with_background_and_text_pixels() {
    let mut engine = sample();
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("frame.png");
    engine.render_png(path.to_str().unwrap()).unwrap();

    let bytes = fs::read(&path).unwrap();
    assert!(bytes.len() > 1000);
    assert_eq!(
        &bytes[0..8],
        &[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]
    );

    let pixmap = Pixmap::load_png(&path).unwrap();
    let pixel = pixmap.pixel(5, 5).unwrap();
    assert!(
        pixel.red() > 200 && pixel.green() < 60,
        "background was not red"
    );

    let dump = engine.dump().unwrap();
    let text = dump.nodes.iter().find(|node| node.id == 2).unwrap();
    let mut light = 0;
    for y in text.y as u32..(text.y + text.height) as u32 {
        for x in text.x as u32..(text.x + text.width.min(80.0)) as u32 {
            if let Some(pixel) = pixmap.pixel(x, y) {
                if pixel.red() > 200 && pixel.green() > 200 && pixel.blue() > 200 {
                    light += 1;
                }
            }
        }
    }
    assert!(light > 20, "expected white glyph pixels, found {light}");
}

#[test]
fn style_parser_rejects_bad_colors_without_mutating() {
    let mut engine = sample();
    let before = engine.scene.node(1).unwrap().style.background;
    let result = engine.apply_json(
        r##"{"v":0,"frame":3,"ops":[
          {"op":"style","id":1,"props":{"backgroundColor":"not-a-color"}}
        ]}"##,
    );
    assert!(result.is_err());
    assert_eq!(engine.scene.node(1).unwrap().style.background, before);
}

#[test]
fn supports_row_layout_and_gap() {
    let mut engine = Engine::new(200.0, 100.0);
    apply(
        &mut engine,
        r##"[
          {"op":"create","id":1,"kind":"view","parent":0,"index":0},
          {"op":"style","id":1,"props":{"flexDirection":"row","gap":10,"padding":10}},
          {"op":"create","id":2,"kind":"view","parent":1,"index":0},
          {"op":"style","id":2,"props":{"width":40,"height":20,"backgroundColor":"#00ff00"}},
          {"op":"create","id":3,"kind":"view","parent":1,"index":1},
          {"op":"style","id":3,"props":{"width":40,"height":20,"backgroundColor":"#0000ff"}}
        ]"##,
    );
    let dump = engine.dump().unwrap();
    let first = dump.nodes.iter().find(|node| node.id == 2).unwrap();
    let second = dump.nodes.iter().find(|node| node.id == 3).unwrap();
    assert_eq!(first.x, 10.0);
    assert_eq!(second.x, 60.0);
}
