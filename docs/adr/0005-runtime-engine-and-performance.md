# 0005 — Runtime engine and performance strategy

Status: accepted    Date: 2026-11-26    Deciders: Devansh Arora

## Context

V0 embeds QuickJS through rquickjs. It was chosen for size and simplicity: a
small C engine, no JIT, no per-platform V8 build, and a narrow host boundary
(`__tardis_ts_flush`, `__tardis_ts_event`). It proved the TSX → scene → Rust pipeline.

The goal is a TSX framework that is competitive with Rust UI frameworks such as
Dioxus. The honest performance facts:

- QuickJS is an interpreter. It is several times slower than V8/JavaScriptCore
  on compute-heavy JavaScript, and far slower than native Rust. The exact gap is
  workload-dependent and has not been measured here.
- The renderer, layout, and text stack are already Rust. Rendering can become
  native-class if it moves to wgpu with batching and incremental layout.
- Application logic authored in TypeScript will not run at Rust speed inside
  QuickJS. No engine makes TypeScript equal to native Rust on raw CPU work; V8
  only narrows the gap.
- Dioxus's desktop default is a system webview, so its Rust speed applies to
  application logic, not paint. Its experimental Blitz renderer uses WGPU.
- Dioxus is also not the fastest Rust UI framework (Leptos and others beat it on
  some benchmarks). "Beat Dioxus" is a lower bar than "beat Rust".

## Options

1. **Keep QuickJS and move frame-critical work into Rust.**
   Small binary, simple build. App logic stays interpreted. Works when UI logic
   is a small share of frame time; loses on logic-heavy workloads.
2. **Swap to V8 (rusty_v8).**
   Fast JIT; closes most of the logic gap. Costs ~30–50 MB of binary, platform
   builds, and a heavier dependency. Still not native Rust.
3. **JavaScriptCore.**
   Fast, but embedding on Linux/Windows is harder and Apple-centric.
4. **Compile TypeScript to native (SWC → LLVM, Porffor).**
   The only path to true Rust-class logic, but the toolchain is immature and
   would make the compiler the product for years.
5. **Compile TypeScript to WASM (AssemblyScript/Javy).**
   Still a managed/interpreted boundary for most TS semantics; not native.
6. **Hybrid: QuickJS small build + V8 performance build, shared host boundary.**
   Keeps the alpha simple; makes the engine a measured, swappable decision.

## Decision

Adopt **option 1 now, with option 6 as the gate.**

- QuickJS remains the default for the alpha. It is not the performance story and
  will not be marketed as one.
- Build the benchmark harness **before** further optimization claims. No
  "faster than Dioxus" statement without pre-registered numbers.
- Move frame-critical work to Rust: virtualized lists, incremental layout,
  glyph atlas and batched draw, binary/shared-memory patches, and wgpu.
- Keep the host boundary engine-agnostic. Benchmark V8 behind the same two
  functions on the same workloads.
- **Gate:** if, after the Rust hot-path work, logic-heavy p95 frame time is more
  than 2× slower than Dioxus on the primary workloads, ship a V8 performance
  build and keep QuickJS as the small build. Binary budget for the V8 build:
  ≤ 50 MB release.
- **Win condition:** not a blanket "faster than Rust". Beat Dioxus on the
  pre-registered performance scorecard, reach feature parity on table stakes,
  and win on TSX developer experience. Publish losses as well as wins.

## Consequences

- "As fast as Rust" is removed from the roadmap. The claim becomes: native-class
  rendering and startup with TypeScript authoring; Rust-level logic only in
  hot paths moved to Rust.
- V8 is a possible future default for performance builds; QuickJS stays for size
  and simplicity.
- The benchmark harness and its published results become the source of truth.
- Feature work (keyboard/IME, router, SSR, packaging) is required before any
  "better than Dioxus" claim, even if performance wins.
- Mobile stays deferred.

## Revisit

After the M5 benchmark. Supersede this ADR if the scorecard shows the renderer,
not the engine, is the dominant cost (then wgpu is the only priority) or if V8
misses the binary/size budget.
