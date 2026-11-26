# Dioxus baseline

A minimal Dioxus 0.6.3 desktop app used only for a startup and binary-size
baseline on this machine. It is not a UI benchmark: Dioxus desktop renders in a
system webview, and frame timing needs instrumentation that is not wired here.

Build and run:

```sh
CARGO_TARGET_DIR=$PWD/bench/dioxus-desktop/target \
  cargo build --release --manifest-path bench/dioxus-desktop/Cargo.toml
xvfb-run -a ./bench/dioxus-desktop/target/release/dioxus-baseline
```

The comparison must use the same machine, a release build, and the same
window size. Report it as startup/binary size only, never as a full performance
win.
