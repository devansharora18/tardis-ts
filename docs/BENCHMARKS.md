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
