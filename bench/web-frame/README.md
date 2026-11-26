# Web frame-time benchmark

Both apps render 10,000 rows and update every row for 120 animation frames.
Each frame sets a tick signal, waits for the next `requestAnimationFrame`, and
records the interval. The runner alternates app order across three rounds and
reports the median mean/p50/p95 frame interval, dropped frames (>16.7 ms), and
effective FPS.

```sh
./bench/web-frame/build.sh
node bench/web-frame/run.mjs
```

Requires Chromium through Playwright (`npm root -g`) and `wasm32-unknown-unknown`
plus `wasm-bindgen-cli` for the Dioxus app. Results are written to
`bench/web-frame/results.json`.
