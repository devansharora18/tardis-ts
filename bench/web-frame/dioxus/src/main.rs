use dioxus::prelude::*;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;

const ROWS: usize = 10_000;
const FRAMES: usize = 120;

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
    let p50 = frames[count / 2];
    let p95 = frames[(count * 95 / 100).min(count - 1)];
    let dropped = frames.iter().filter(|value| **value > 16.7).count();
    let result = js_sys::Object::new();
    for (key, value) in [
        ("frames", count as f64),
        ("mean", mean),
        ("p50", p50),
        ("p95", p95),
        ("dropped", dropped as f64),
        ("fps", 1000.0 / mean),
    ] {
        let _ = js_sys::Reflect::set(
            &result,
            &JsValue::from_str(key),
            &JsValue::from_f64(value),
        );
    }
    let _ = js_sys::Reflect::set(&window(), &JsValue::from_str("__benchResult"), &result);
}

#[component]
fn App() -> Element {
    let mut tick = use_signal(|| 0usize);

    use_future(move || async move {
        sleep(400).await;
        let mut samples = Vec::with_capacity(FRAMES);
        let mut last = window()
            .performance()
            .expect("performance")
            .now();
        for index in 0..FRAMES {
            tick.set(index);
            next_frame().await;
            let now = window().performance().expect("performance").now();
            samples.push(now - last);
            last = now;
        }
        report(&mut samples);
    });

    let current = tick();
    rsx! {
        div {
            style: "font:12px monospace;background:#0a0a0a;color:#ededed",
            for index in 0..ROWS {
                div { key: "{index}", "{index}: {current}" }
            }
        }
    }
}

fn main() {
    dioxus::launch(App);
}
