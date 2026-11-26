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
| 40 | Style/text updates apply in place after validation; structural patches keep the atomic clone | The clone was O(n) per update; patch apply is now ~0.003 ms |
| 41 | The taffy tree persists across style/text updates | Rebuilding 10k nodes dominated updates (445 ms -> ~21 ms layout, 23 ms total) |
| 42 | Paint culls offscreen subtrees and clips `overflow: hidden` | 10k paint 150 ms -> 1.9 ms; virtual lists do not bleed |
| 43 | 10k rows require virtualization; the virtual window is the production shape | Fully mounted 10k still updates in 23 ms; the 40-node window updates in 0.55 ms |
| 44 | Dioxus desktop is a startup/size baseline only | No frame-time instrumentation; web blocked without wasm toolchain; no blanket claim |
| 45 | Intrinsic tags travel in create ops; web renders real semantic elements | Restores button/heading/paragraph/accessibility semantics lost by generic divs |
| 46 | `role`/`tabIndex`/`aria-*` travel in an `a11y` op | Web sets attributes; native stores them for accesskit; native ignores visually |
| 47 | Pointer down sets focus, fires blur/focus/pointerdown; up fires pointerup/click | A usable focus lifecycle without a platform focus tree |
| 48 | TextField is a scene composition, not a native input node | Same TSX on both hosts; single-line caret editing now, IME/native input later |
| 49 | Clipboard uses memory + navigator.clipboard + native arboard | Works without a display; system clipboard where available |
| 50 | Selection, multiline, and IME are deferred | They require platform text/IME plumbing, not fakeable in this slice |
| 51 | `createForm` owns values/touched/errors/submitting; no schema dependency | Apps own validation rules; the form owns state transitions |
| 52 | `createResource` ignores stale responses instead of cancelling | No AbortSignal plumbing yet; correctness is preserved, cancellation is TODO |
| 53 | Form errors surface after touch or submit | Avoids showing errors while a user is first typing |
| 54 | `TextField` exposes `onBlur` for form integration | Touched/error state needs a blur boundary |
| 55 | SSR uses a StringHost over the same patch stream | No second renderer or compiler; inline styles and semantic tags match the client |
| 56 | Hydration is a verified remount, not node adoption | The scene runtime emits direct DOM ops; comparing text and replacing nodes is deterministic, adoption is future work |
| 57 | Web and SSR share style/tag/default tables | Server and client markup must not drift |
| 58 | No streaming SSR or data prefetch yet | The API is synchronous and factory-based; streaming needs a different host |
| 59 | ScrollView uses an absolute inner offset plus parent clipping | No native scroll node; works identically on web and native; content height is explicit |
| 60 | Boundary catches render-time errors, not effect errors | Effect errors are caught/logged by the signal graph; routing them needs an error sink |
| 61 | HiDPI keeps layout logical and scales raster/text/bounds | One layout model; crisp text; input divides physical coordinates by scale |
| 62 | Headless `--scale` produces physical PNG dimensions | Lets CI verify HiDPI raster without a Retina display |
