#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
npm run build
mkdir -p bench/sheet-frame/tardis
node dist/bin/tardis-ts.js build examples/spreadsheet/app.tsx --target web --out "$PWD/bench/sheet-frame/tardis/app.js"
cargo build --release --target wasm32-unknown-unknown --manifest-path bench/web-frame/dioxus-sheet/Cargo.toml
wasm-bindgen --target web --no-typescript \
  bench/web-frame/dioxus-sheet/target/wasm32-unknown-unknown/release/dioxus_sheet_bench.wasm \
  --out-dir bench/web-frame/dioxus-sheet
