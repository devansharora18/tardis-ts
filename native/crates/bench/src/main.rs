// Core performance harness.
//
// Builds a column of N rows, one text node per row, then measures:
//   - mount: layout + paint from a fresh scene
//   - text update: one text op through Engine::apply, then paint
//   - style update: one background op through Engine::apply, then paint
//   - layout only / paint only
//
// Run release for meaningful numbers:
//   cargo run -p tardis-ts-bench --release -- --rows 10000 --runs 5

use std::time::Instant;

use serde::Serialize;
use tardis_ts_core::layout::ComputedLayout;
use tardis_ts_core::paint::{render, RenderOptions};
use tardis_ts_core::patch::{Op, Patch};
use tardis_ts_core::scene::{AlignItems, Color, FlexDirection, Node, NodeKind, Scene};
use tardis_ts_core::{Engine, TextEngine};

const WIDTH: f32 = 1200.0;
const HEIGHT: f32 = 800.0;
const ROW_HEIGHT: f32 = 48.0;

#[derive(Serialize)]
struct Stats {
    median_ms: f64,
    p95_ms: f64,
}

#[derive(Serialize)]
struct RowResult {
    rows: u32,
    mount_layout: Stats,
    mount_paint: Stats,
    mount_total: Stats,
    update_text_apply: Stats,
    update_text_patch: Stats,
    update_text_layout: Stats,
    update_text_paint: Stats,
    update_text_total: Stats,
    update_style_apply: Stats,
    update_style_paint: Stats,
    update_style_total: Stats,
}

fn main() {
    let mut rows = 1_000;
    let mut runs = 5;
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--rows" => {
                rows = args
                    .next()
                    .and_then(|value| value.parse().ok())
                    .unwrap_or(rows);
            }
            "--runs" => {
                runs = args
                    .next()
                    .and_then(|value| value.parse().ok())
                    .unwrap_or(runs);
            }
            "--help" | "-h" => {
                println!("tardis-ts-bench [--rows N] [--runs N]");
                return;
            }
            other => {
                eprintln!("unknown argument: {other}");
                std::process::exit(1);
            }
        }
    }
    if rows < 1 || runs < 1 {
        eprintln!("--rows and --runs must be positive");
        std::process::exit(1);
    }

    let result = run(rows, runs);
    println!("{}", serde_json::to_string_pretty(&result).unwrap());
}

fn run(rows: u32, runs: usize) -> RowResult {
    let row_id = 2 + 2 * (rows / 2);
    let text_id = 3 + 2 * (rows / 2);

    let mut mount_layout = Vec::with_capacity(runs);
    let mut mount_paint = Vec::with_capacity(runs);
    let mut mount_total = Vec::with_capacity(runs);
    let mut update_text_apply = Vec::with_capacity(runs);
    let mut update_text_patch = Vec::with_capacity(runs);
    let mut update_text_layout = Vec::with_capacity(runs);
    let mut update_text_paint = Vec::with_capacity(runs);
    let mut update_text_total = Vec::with_capacity(runs);
    let mut update_style_apply = Vec::with_capacity(runs);
    let mut update_style_paint = Vec::with_capacity(runs);
    let mut update_style_total = Vec::with_capacity(runs);

    for run_index in 0..runs {
        let scene = build_scene(rows);
        let mut engine = Engine::new(WIDTH, HEIGHT);
        engine.scene = scene;
        engine.layout = None;

        let layout_time = time(|| engine.relayout().unwrap());
        let layout = engine.layout.clone().unwrap();
        let paint_time = time(|| paint(&engine.scene, &layout, &mut engine.text));
        mount_layout.push(layout_time);
        mount_paint.push(paint_time);
        mount_total.push(layout_time + paint_time);

        // Text update on the middle row.
        let value = format!("Row {} updated {}", rows / 2, run_index);
        let patch = Patch {
            v: 0,
            frame: 1,
            ops: vec![Op::Text { id: text_id, value }],
        };
        let timing = engine.apply_timed(patch).unwrap();
        let apply_time = timing.patch_ms + timing.layout_ms;
        let layout = engine.layout.clone().unwrap();
        let paint_time = time(|| paint(&engine.scene, &layout, &mut engine.text));
        update_text_apply.push(apply_time);
        update_text_patch.push(timing.patch_ms);
        update_text_layout.push(timing.layout_ms);
        update_text_paint.push(paint_time);
        update_text_total.push(apply_time + paint_time);

        // Style update on the middle row.
        let mut props = serde_json::Map::new();
        let color = if run_index % 2 == 0 {
            "#222222"
        } else {
            "#111111"
        };
        props.insert(
            "backgroundColor".to_string(),
            serde_json::Value::String(color.to_string()),
        );
        let patch = Patch {
            v: 0,
            frame: 2,
            ops: vec![Op::Style { id: row_id, props }],
        };
        let apply_time = time(|| engine.apply(patch).unwrap());
        let layout = engine.layout.clone().unwrap();
        let paint_time = time(|| paint(&engine.scene, &layout, &mut engine.text));
        update_style_apply.push(apply_time);
        update_style_paint.push(paint_time);
        update_style_total.push(apply_time + paint_time);
    }

    RowResult {
        rows,
        mount_layout: stats(&mount_layout),
        mount_paint: stats(&mount_paint),
        mount_total: stats(&mount_total),
        update_text_apply: stats(&update_text_apply),
        update_text_patch: stats(&update_text_patch),
        update_text_layout: stats(&update_text_layout),
        update_text_paint: stats(&update_text_paint),
        update_text_total: stats(&update_text_total),
        update_style_apply: stats(&update_style_apply),
        update_style_paint: stats(&update_style_paint),
        update_style_total: stats(&update_style_total),
    }
}

fn build_scene(rows: u32) -> Scene {
    let mut scene = Scene::new();
    let mut column = Node::new(1, NodeKind::View);
    column.parent = Some(0);
    column.style.flex_direction = FlexDirection::Column;
    column.style.width = Some(WIDTH);
    scene.nodes.insert(1, column);
    scene.nodes.get_mut(&0).expect("root").children.push(1);

    let mut next_id = 2;
    for index in 0..rows {
        let row_id = next_id;
        let text_id = next_id + 1;
        next_id += 2;

        let mut row = Node::new(row_id, NodeKind::View);
        row.parent = Some(1);
        row.style.height = Some(ROW_HEIGHT);
        row.style.flex_direction = FlexDirection::Row;
        row.style.align_items = AlignItems::Center;
        row.style.padding.left = 12.0;
        if index % 2 == 0 {
            row.style.background = Some(Color::rgb(0x11, 0x11, 0x11));
        }
        scene.nodes.insert(row_id, row);

        let mut text = Node::new(text_id, NodeKind::Text);
        text.parent = Some(row_id);
        text.text = format!("Row {index}");
        text.style.font_size = Some(14.0);
        text.style.line_height = Some(20.0);
        text.style.color = Some(Color::rgb(0xed, 0xed, 0xed));
        scene.nodes.insert(text_id, text);

        scene
            .nodes
            .get_mut(&1)
            .expect("column")
            .children
            .push(row_id);
        scene
            .nodes
            .get_mut(&row_id)
            .expect("row")
            .children
            .push(text_id);
    }
    scene
}

fn paint(scene: &Scene, layout: &ComputedLayout, text: &mut TextEngine) {
    let _ = render(
        scene,
        layout,
        text,
        &RenderOptions {
            width: WIDTH as u32,
            height: HEIGHT as u32,
            scale: 1.0,
            background: Color::rgb(0x0a, 0x0a, 0x0a),
        },
    )
    .expect("paint");
}

fn time<F: FnOnce() -> R, R>(f: F) -> f64 {
    let start = Instant::now();
    let _ = f();
    start.elapsed().as_secs_f64() * 1000.0
}

fn stats(values: &[f64]) -> Stats {
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let median = sorted[sorted.len() / 2];
    let p95_index = ((sorted.len() as f64) * 0.95).ceil() as usize - 1;
    Stats {
        median_ms: round(median),
        p95_ms: round(sorted[p95_index.min(sorted.len() - 1)]),
    }
}

fn round(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}
