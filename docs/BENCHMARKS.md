# Benchmarks

No performance claim ships without numbers from this document. The point is to
be able to lose in public.

## Anti-reward-hacking rules

- Pre-register workloads, metrics, and win conditions **before** running.
- Same machine, same viewport, release builds, no devtools, no debug logging.
- Five runs minimum; report median and p95, not the best run.
- Record the exact Tardis commit, Dioxus version/commit, OS, CPU, RAM, GPU,
  driver, and Node/Rust versions.
- Publish the harness, raw JSON, and the command lines. Include losses.
- Never compare best-of-ours to worst-of-theirs, native to web, or dev to release.
- A win is only a win on the pre-registered scorecard. A single microbenchmark is
  not "faster than Dioxus".
- "Better" also requires table-stakes feature parity. Performance alone does not
  make a framework better.

## Workloads

| # | Workload | Metrics |
|---|---|---|
| 1 | Counter: mount + 10,000 updates | mount ms, update p50/p95, RSS |
| 2 | 1,000-row list: mount, filter, sort, update one row, 100 scroll frames | mount ms, update p95, scroll frame p95 |
| 3 | 10,000-row list: same | mount ms, update p95, scroll frame p95 |
| 4 | Text-heavy: 1,000 paragraphs, wrap and paint | layout ms, paint ms, frame p95 |
| 5 | Cold start to first frame (native); time-to-interactive (web) | ms |
| 6 | Size | native binary MB, web JS/WASM gzip KB, RSS MB |

Every workload uses the same visual output and the same data on both frameworks.
The app source lives in `bench/<framework>/` and is versioned with the harness.

## Scorecard

Primary metrics: 10k scroll p95, 1k filter/update p95, mount, cold start, web
TTI, web bundle size.

Win condition:

- At least **1.25× faster on four of six** primary metrics,
- no regression worse than **10%** on any primary metric,
- feature parity on keyboard/focus/IME, router, SSR (web), and platform
  packaging,
- and a documented developer-experience advantage (TSX/TypeScript vs RSX/Rust).

Until all four hold, the honest statement is "competitive on X", not "better
than Dioxus".

## Environment

Fill this in on the benchmark machine before the first run:

```
CPU:
RAM:
GPU / driver:
OS / kernel:
Node:
Rust:
Tardis commit:
Dioxus version/commit:
Viewport: 1200x800
```

## Current status

- No Tardis frame/startup/size numbers have been collected.
- Dioxus is not installed in this environment; no head-to-head has been run.
- Known v0 costs, from code inspection only:
  - full taffy tree rebuild per patch (`layout_scene`),
  - per-glyph pixmap allocation and blit (`paint.rs`),
  - JSON patch per frame,
  - QuickJS, layout, and raster on the UI thread,
  - dynamic arrays rebuilt, not keyed.
- The native/web end-to-end tests prove correctness, not speed.

## Engine diagnostic (optional, not a product claim)

Before choosing V8, run the same pure-JS workload in QuickJS, V8 (Node), and
native Rust:

- integer/float loop (10M iterations),
- array sort (1M numbers),
- JSON parse/stringify (10 MB),
- a representative row-filter transform (10k objects).

This isolates the engine gap from rendering. It does not replace the UI
benchmarks.

## Harness TODO

- `bench/harness.mjs`: spawn both apps, drive clicks/scroll, sample frame times
  via the host, write JSON.
- `bench/dioxus/`: the same UI in Dioxus (web + desktop), pinned version.
- `bench/tardis/`: the same UI in TSX, native + web.
- `npm run bench` with `--runs 5 --json out.json`.
- CI job on a quiet runner; publish results per release.

## Results — 2026-11-27

Machine: AMD Ryzen AI 7 350, 16 threads, 30 GB RAM, Linux (X11/Mesa), release
builds. Core harness only: patch decode/apply, taffy layout, tiny-skia paint.
QuickJS startup and app logic are not part of these numbers.

Raw JSON: `bench/results/2026-11-27-{baseline,final}-{40,1k,10k}.json`.

| Workload | Baseline | Current | Change |
|---|---:|---:|---:|
| 1k mount (layout + paint) | 53.3 ms | 43.0 ms | 1.24× |
| 1k text update (total) | 50.1 ms | 1.97 ms | 25.4× |
| 1k paint | 14.0 ms | 0.65 ms | 21.5× |
| 10k mount (layout + paint) | 575.0 ms | 423.6 ms | 1.36× |
| 10k text update (total) | 594.6 ms | 23.0 ms | 25.8× |
| 10k paint | 150.0 ms | 1.87 ms | 80× |
| 40-row window (virtual list shape) | — | 0.55 ms update / 3.1 ms mount | — |

What changed:

1. Style/text-only patches no longer clone the scene; patch apply is ~0.003 ms.
2. The taffy tree is reused; style/text updates dirty nodes instead of rebuilding
   the tree.
3. Paint culls fully offscreen subtrees and clips `overflow: hidden` views.
4. Glyphs blend directly into the target pixmap; no per-glyph pixmap allocation.
5. `VirtualList` mounts ~40 scene nodes for 10,000 rows. Native e2e confirms the
   dump has fewer than 100 nodes and wheel scrolling moves the window (Row 0 →
   Row 8).

Honest reading:

- A **fully mounted 10k-row scene** still takes ~23 ms for one text update,
  above the 16.6 ms gate. Taffy lays out the 10k-sibling column; this is a stress
  case, not the production shape.
- The **virtualized 10k app** updates in ~0.55 ms and mounts in ~3.1 ms. This is
  the path a real application uses, and it passes the 60 fps gate with headroom.
- Mount at 10k fully mounted is 424 ms, dominated by text measurement and layout.
  Virtualized mount is 3 ms.
- These are Tardis-vs-Tardis improvements. They are not a Dioxus comparison.

## Dioxus baseline status

A minimal Dioxus 0.6.3 desktop app lives in `bench/dioxus-desktop/`. Desktop
startup and binary size can be measured on this machine (webkit2gtk-4.1 is
present). Web needs wasm32 + wasm-bindgen/dx, which are not installed; that arm
is blocked and must not be claimed.

Measured on this machine: window first-paint startup (process start to first
changed root pixel, five/three runs, Xvfb):

| App | Runs | Median | Binary |
|---|---:|---:|---:|
| Tardis native counter | 459 / 451 / 439 ms | **451 ms** | **7.3 MB** |
| Dioxus 0.6.3 desktop counter | 925 / 612 / 625 ms | 625 ms | 8.7 MB |

Method and raw values: `bench/results/2026-11-27-startup.txt`,
`bench/measure-startup.sh`. Different UIs and renderers; startup and binary size
only. This is a measured Tardis win on those two axes, not a frame-time or
feature-parity win.

## Web frame-time head-to-head (2026-11-27)

Same app shape in Chrome (headless, 1000x800), 10,000 fully-mounted rows, every
row's text updated on every animation frame for 120 frames. Both apps use the
same text (`row: tick`), no virtualization, and the runner alternates app order
across three rounds and reports the median. Source:
`bench/web-frame/`; raw values: `bench/web-frame/results.json`.

| App | Mean frame | p50 | p95 | Dropped (>16.7 ms) | Effective FPS |
|---|---:|---:|---:|---:|---:|
| TardisJS 2.0 web | 143.1 ms | 140.5 ms | 177.9 ms | 119/120 | **7.0** |
| Dioxus 0.6.3 web | 93.2 ms | 89.7 ms | 111.5 ms | 119/120 | **10.7** |

Dioxus is ~1.54x faster on this workload. Both apps miss 60 fps badly because
10,000 mounted DOM rows is not the production shape. The result is a Tardis
loss, not a win; it stays in the repo because hiding it would be dishonest.

Why Tardis loses here:

1. Every scene text node is a DOM element (`span`) plus a text child, so the page
   has ~2x the element count of Dioxus' text nodes.
2. 10,000 per-node effects run and detach each frame; Dioxus diffs one component.
3. Patch application is JS per node (even after removing JSON from the web path).

The next optimization is a text fast path that maps plain scene text to raw DOM
text nodes (with anchors for hydration), plus effect batching. Until that exists,
the recommended large-list shape remains `VirtualList`, where Tardis updates
~0.55 ms natively.

Startup/size remains a Tardis win (451 ms vs 625 ms first paint; 7.3 MB vs
8.7 MB). Native paint is 1.87 ms for 10k rows. The browser full-list frame loss
stands.

What is still missing:

- A Dioxus native frame-time comparison (desktop uses a webview; paint timing is
  not exposed).
- A virtualized browser head-to-head (both should sit at vsync; not yet run).
- Feature parity: Dioxus has SSR/fullstack, mobile, and a larger ecosystem.

No blanket "better than Dioxus" claim is justified.
