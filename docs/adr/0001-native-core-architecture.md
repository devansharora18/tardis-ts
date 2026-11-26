# 0001 — Native core with a TypeScript surface

Status: accepted    Date: 2026-11-26    Deciders: Devansh Arora
Note: re-homed from the discarded `basalt` scaffold; architecture unchanged.

## Context

Tardis TS is a compiled TypeScript blueprint framework for the web. It has a
parser, a code generator that emits direct DOM operations, fine-grained
reactivity, SSR, and hydration. Its performance ceiling is the DOM plus
JavaScript execution, which is the correct ceiling for web apps and the wrong
one for native-class UI.

The goal is a cross-platform framework with React-level readability that holds
60–120fps on large lists, dense tables, and charts. Rust frameworks (Leptos,
Dioxus, Slint) reach native frame times but require application authors to
write Rust. That developer experience is the problem, not the performance.

The question is where the native code must live to get native-class rendering,
and how small that surface can be kept.

## Options

1. **Stay pure TypeScript on the DOM** (Tardis TS today).
   Best DX, zero native maintenance, but the DOM is the ceiling. Cannot hold a
   10k-row table at 60fps without virtualization, and cannot leave the web.

2. **TypeScript compiled to WASM, hosted by a native renderer.**
   True cross-platform binary and sandboxing, but the toolchain for TypeScript
   semantics in WASM is immature (GC, dynamic objects), npm interop is lost,
   and the WASM↔host boundary costs per call. The compiler would need a second
   backend before any UI exists.

3. **Embedded JS engine plus a small Rust renderer** (chosen).
   App logic stays JavaScript (QuickJS embedded via rquickjs). Rust owns only
   what must run every frame: window, layout, text, GPU draw, input,
   accessibility. The boundary is a per-frame scene patch, not a per-property
   call. Rust never learns components, props, or state.

4. **TypeScript to native AOT** (SWC → LLVM, porffor, AssemblyScript).
   Fastest possible result, but years away from supporting real TypeScript, and
   it would make the compiler the product instead of the framework.

5. **Rust-first surface** (Dioxus/Leptos model).
   Rejected: it recreates the exact DX problem the project exists to solve.

## Decision

Option 3. The framework ships a TypeScript/blueprint surface, an in-process
QuickJS runtime, and a Rust core of roughly 10k lines that owns layout (taffy),
text (cosmic-text), rendering (wgpu), windowing/input (winit), and
accessibility (accesskit).

The core is deliberately dumb: it decodes a scene patch, lays out, draws, and
reports input. All application semantics live in JS. This keeps the part that
must be maintained in Rust small and stable, while the part that changes daily
— components, widgets, state, routing — stays in TypeScript.

## Consequences

- The repository carries two languages. The Rust core is a maintenance burden
  even when it is not changing.
- Desktop first. Web is the existing backend; mobile comes after desktop.
- QuickJS is slower than V8 on CPU-bound JavaScript. Mitigation: keep hot loops
  (virtualized list range math, layout, text) native, and add a native escape
  hatch for application code later. The performance claim is native-class frame
  times, not Rust end-to-end.
- Binaries are larger than a web build (embedded engine plus wgpu). Measure and
  budget from M1.
- IME, accessibility, and font fallback are platform-hard and land after the
  first vertical slice.
- npm packages that touch the DOM will not work in native builds. Pure-JS
  packages do.
- The existing Tardis TS parser and compiler are reused at commit `6117586`.
  The web backend stays and remains the reference implementation.

## Revisit

If QuickJS becomes the bottleneck on real workloads after M5, swap the engine
behind the same narrow host boundary (V8 via rusty_v8) before considering a
compiler rewrite. If desktop text and IME cost more than two milestones, cut
the scope to lists/tables/charts and ship a focused product instead of a
general-purpose UI toolkit.
