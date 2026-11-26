# Decisions — v2 rewrite

Assumptions and choices made during the TSX-native rewrite, newest first.

| # | Decision | Reason |
|---|---|---|
| 1 | Package name stays `@devansharora18/tardisjs`; version `2.0.0-alpha.0` | The npm identity is the asset |
| 2 | `.tardis` and every v1 artifact are removed, not deprecated | Explicit directive; a dual surface doubles the compiler and docs |
| 3 | App imports use `@devansharora18/tardisjs/scene`; the bundler also aliases `tardisjs/scene` | Imports match the published package; short alias stays for generated/legacy code |
| 4 | Native desktop is the first target; web follows through a DOM patch adapter | Native proves the renderer; web reuses the same scene runtime |
| 5 | TSX compiles to a retained scene tree, not a VDOM | One operation per change, no virtual tree diff |
| 6 | Non-event JSX props compile to getters | Fine-grained updates without re-running components |
| 7 | Event props (`on[A-Z]`), `key`, `ref`, function props stay unwrapped | Wrapping callbacks would turn them into getters of functions |
| 8 | The compiler is a TypeScript transformer inside `ts.transpileModule` | Reuses the TypeScript parser; no second grammar |
| 9 | Intrinsic tags are a closed set (`div`, headings, `p`, `button`, …) | Readable JSX without a CSS engine |
| 10 | Layout is flexbox via taffy; no CSS parser | Styles are typed objects |
| 11 | v0 renders with tiny-skia on the CPU | Works headless and without a GPU; wgpu swaps in later |
| 12 | Patch protocol v0 is JSON; the op set is stable | Debuggable bring-up; binary is a transport change |
| 13 | Text uses bundled Liberation Sans regular/bold | Deterministic output without system fonts |
| 14 | Dynamic arrays rebuild; keyed reuse is deferred | Correctness first; reconciliation is M5 |
| 15 | The docs site, 19 demos, and VSCode grammar are removed | They only compile with v1; new docs are Markdown |
| 16 | Rust crates live under `native/` in this repo | Compiler and renderer must version together |
| 17 | Headless defaults: 800×600, background `#0a0a0a` | Matches golden-image tests |
| 18 | Native binary is built from the repo, not shipped in the npm tarball yet | Platform packaging is M6; `TARDIS_NATIVE_BIN` is the escape hatch |
| 19 | `tardis dev` restarts the process; no in-process hot re-eval | Simpler than QuickJS state migration; fast enough for v0 |
| 20 | The window is 1x scale; HiDPI deferred | Requires a coordinate/scale pass through layout and input |
| 21 | Text is not clipped; images render as placeholders; scroll offsets are stored but not painted | Kept the v0 surface honest and small |
| 22 | End-to-end proof uses `--click x,y` plus `--dump` | Hit testing and signal updates verified without a GUI driver |
| 23 | Window mode is compiled in by default; headless builds use `--no-default-features` | CI needs no X11/Wayland |
| 24 | The old v1 signals implementation is gone; scene/signals is the only graph | No dual runtime |
| 25 | Web uses a DOM patch adapter, not a canvas/WASM renderer | Keeps text selection, accessibility, and browser layout; no WASM payload (ADR 0004) |
| 26 | Mobile is explicitly deferred | Desktop and web must be solid first |
| 27 | The same TSX entry imports `@devansharora18/tardisjs/web` for its side effect | In QuickJS `typeof document === 'undefined'`, so the import is a no-op |
| 28 | Web maps scene styles to CSS flex with `box-sizing: border-box` | Matches taffy sizing; line heights are explicit to reduce drift |
| 29 | `build --target web` writes `dist/web/app.js` plus a generated `index.html` | One command produces a servable app |
| 30 | Web dev reload polls `/__tardis_version` every 700ms | No WebSocket or extra dependency; works with any static server |
| 31 | CI runs a Linux/macOS/Windows matrix | Compile/test coverage; GUI smoke remains a host check |
| 32 | npm scripts use Node for clean/chmod instead of `rm`/`chmod` | Windows compatibility |
| 33 | The native e2e builds into `native/target/headless` | Tests must not overwrite the window-enabled binary |
| 34 | The native e2e appends `.exe` on Windows | Cross-platform binary lookup |
| 35 | The default build target stays native; web is `--target web` | The native renderer is the differentiator; web is explicit |
| 36 | QuickJS stays for the alpha but is not the performance engine; V8 is gated on benchmarks | ADR 0005; QuickJS was a size/simplicity choice, not a speed claim |
| 37 | No performance claim without pre-registered benchmarks; publish losses | Anti-reward-hacking; the harness must be able to show Tardis losing |
| 38 | "Better than Dioxus" means 1.25x on 4 of 6 primary metrics, no >10% regressions, feature parity, and TSX DX | One microbenchmark is not a framework win |
| 39 | Frame-critical work moves to Rust: virtualization, incremental layout, glyph atlas/batching, wgpu | The JS engine cannot fix rendering cost |
