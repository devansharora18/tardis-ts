use dioxus::prelude::*;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;

const ROWS: usize = 100_000;
const ROW_HEIGHT: usize = 30;
const VISIBLE: usize = 24;
const COLUMNS: usize = 8;
const FRAMES: usize = 120;
const MAX_SCROLL: usize = (ROWS - VISIBLE) * ROW_HEIGHT;

fn window() -> web_sys::Window {
    web_sys::window().expect("browser window")
}

async fn next_frame() {
    let promise = js_sys::Promise::new(&mut |resolve, _| {
        window()
            .request_animation_frame(&resolve)
            .expect("requestAnimationFrame");
    });
    let _ = JsFuture::from(promise).await;
}

async fn sleep(ms: i32) {
    let promise = js_sys::Promise::new(&mut |resolve, _| {
        window()
            .set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, ms)
            .expect("setTimeout");
    });
    let _ = JsFuture::from(promise).await;
}

fn report(frames: &mut [f64]) {
    frames.sort_by(f64::total_cmp);
    let count = frames.len();
    let mean = frames.iter().sum::<f64>() / count as f64;
    let result = js_sys::Object::new();
    let values = [
        ("frames", count as f64),
        ("mean", mean),
        ("p50", frames[count / 2]),
        ("p95", frames[(count * 95 / 100).min(count - 1)]),
        (
            "dropped",
            frames.iter().filter(|value| **value > 16.7).count() as f64,
        ),
        ("fps", 1000.0 / mean),
    ];
    for (key, value) in values {
        let _ = js_sys::Reflect::set(&result, &JsValue::from_str(key), &JsValue::from_f64(value));
    }
    let _ = js_sys::Reflect::set(&window(), &JsValue::from_str("__benchResult"), &result);
}

#[component]
fn App() -> Element {
    let mut scroll = use_signal(|| 0usize);

    use_future(move || async move {
        sleep(400).await;
        let mut samples = Vec::with_capacity(FRAMES);
        let mut last = window().performance().expect("performance").now();
        for frame in 0..FRAMES {
            scroll.set((frame * ROW_HEIGHT * 8) % MAX_SCROLL);
            next_frame().await;
            let now = window().performance().expect("performance").now();
            samples.push(now - last);
            last = now;
        }
        report(&mut samples);
    });

    let start = scroll() / ROW_HEIGHT;
    rsx! {
        div {
            style: "padding:20px;background:#0d1117;color:#c9d1d9;font-family:monospace;font-size:13px",
            div { style: "display:flex;gap:12px;align-items:center;margin-bottom:12px",
                h1 { style: "font-size:18px;margin:0", "Tardis Sheet baseline" }
                span { style: "color:#8b949e;font-size:12px", "100,000 rows × 8 columns · virtualized" }
            }
            div { style: "display:flex;height:30px;border:1px solid #30363d;background:#161b22;color:#8b949e;font-size:11px",
                div { style: "width:54px;padding-left:8px", "#" }
                for column in 0..COLUMNS {
                    div { key: "{column}", style: "width:96px;padding-left:8px", "{column}" }
                }
            }
            div { style: "height:560px;overflow:hidden;border:1px solid #30363d;border-top:0;position:relative",
                div { style: "position:absolute;left:0;right:0;top:0",
                    for offset in 0..VISIBLE {
                        div {
                            key: "{start + offset}",
                            style: "display:flex;height:30px;background:#0d1117;border-bottom:1px solid #1b2027",
                            div { style: "width:54px;padding-left:8px;color:#484f58;font-size:11px;background:#0b0f14", "{start + offset + 1}" }
                            for column in 0..COLUMNS {
                                div { key: "{start + offset}-{column}", style: "width:96px;padding-left:8px" }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn main() {
    dioxus::launch(App);
}
