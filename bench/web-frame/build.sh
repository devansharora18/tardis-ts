#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
npm run build
mkdir -p bench/web-frame/tardis
node dist/bin/tardis.js build bench/web-frame/tardis/app.tsx --target web --out "$PWD/bench/web-frame/tardis/app.js"
cargo build --release --target wasm32-unknown-unknown --manifest-path bench/web-frame/dioxus/Cargo.toml
mkdir -p bench/web-frame/dioxus/generated
wasm-bindgen --target web --no-typescript \
  bench/web-frame/dioxus/target/wasm32-unknown-unknown/release/dioxus_web_bench.wasm \
  --out-dir bench/web-frame/dioxus
