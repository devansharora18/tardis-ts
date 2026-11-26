use dioxus::prelude::*;

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut count = use_signal(|| 0i32);
    rsx! {
        div {
            style: "padding:32px;background:#0a0a0a;color:#ededed;font-family:sans-serif;min-height:100vh",
            h1 { "Dioxus baseline" }
            p { "Count: " {count().to_string()} }
            button {
                onclick: move |_| count.set(count() + 1),
                "Increment"
            }
        }
    }
}
