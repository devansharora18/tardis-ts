# Native target architecture

The native target lives in the same repository as the web framework
([ADR 0002](../adr/0002-native-target-in-monorepo.md)). The parser, blueprint
syntax, signals, tests, CLI, docs, and examples are shared. Only the rendering
backend differs.

## Layers

### 1. Surface

`.basalt`-style blueprints (existing TardisJS syntax) plus a TypeScript API for
widgets and application code. Blueprints compile away; no runtime parser ships.

### 2. Compiler

`parse → typed AST → backend codegen`. The existing web backend is untouched.
The native backend is a sibling module that consumes the same AST and shares
attribute parsing, reference rewriting, props, slots, and control flow.

Output is plain ES2022; esbuild bundles it. Native styles become typed records
with numeric property ids — no CSS strings cross the boundary.

### 3. JS scene runtime (`src/scene/`)

- **Signals** — the existing graph, reused. Push-pull, lazy `computed`,
  effects batched per microtask.
- **Scene tree** — retained tree of integer-id nodes with typed style records.
- **Widgets** — composition over the same node kinds; no special-cased controls.
- **Scheduler** — dirty set, patch encode, flush on frame.

### 4. Bridge

- **Patch buffer** — one contiguous `ArrayBuffer` written by JS and read by
  Rust. v0 encodes JSON ops for debuggability; v1 switches to the binary layout
  in [protocol.md](protocol.md) without changing the op set.
- **Event queue** — fixed-size records written by Rust, drained by JS at frame
  start.
- JS never blocks on layout. Text measurement stays native; JS uses flex
  properties only.

### 5. Rust core (`native/crates/`)

- `winit` — window, input, IME hooks.
- `taffy` — flexbox and grid.
- `cosmic-text` — shaping, fallback, glyph atlas.
- `wgpu` — quad and glyph pipelines, clip stacks, rounded rectangles.
- `accesskit` — accessibility tree (M3).

Target: **≤10k lines**, no application semantics, no component knowledge.

### 6. Shell

- `tardis native dev` (Node CLI) — builds the app bundle with esbuild, then
  spawns the Rust binary. On change, the bundle is re-evaluated inside the
  running QuickJS context; no Rust rebuild.
- `tardis native build` — bundle JS, embed it in the binary, ship one
  executable.

## Frame loop

```
native input ──▶ JS handlers ──▶ signal writes
                                      │
                               microtask flush
                                      │
                          scene diff → patch buffer
                                      │
                     taffy layout → wgpu frame → present
```

Input is dispatched at the start of the frame; handlers run synchronously.
A patch is applied atomically; the renderer never sees a half-updated tree.

## Threading

v0 runs the event loop, QuickJS, layout, and draw on one thread. This is the
simplest correct model and is enough for the vertical slice. Layout and draw can
move to a render thread after v1 once the patch format is stable; JS stays on
the UI thread because handlers read state synchronously.

## Performance budget (60fps = 16.6ms)

| Stage | Budget |
|---|---|
| JS handlers + signal flush | 2.0ms |
| Patch encode | 1.0ms |
| Layout | 2.0ms |
| Text shaping and atlas | 2.0ms |
| Draw and present | 3.0ms |
| Slack | 6.6ms |

At 120fps the budget halves. Anything that exceeds it moves into Rust.

## Repository layout

```
tardisjs/
  src/
    compiler/          web codegen + shared parser helpers
    compiler/native/   native scene codegen (new)
    runtime/           web runtime (unchanged)
    scene/             TS scene runtime (new)
    ssr/               web SSR (unchanged)
    cli/               Node CLI, gains `native` commands
  native/
    Cargo.toml         workspace
    crates/core/       window, layout, text, gpu, input, a11y
    crates/js/         QuickJS host and bridge
    crates/cli/        native dev/build binary
  test/                756 existing tests + new native tests
  examples/            19 web demos, plus native examples later
  tardisjs-site/       docs site
  docs/native/         this document and the protocol
  docs/adr/            architecture decisions
```

The npm package stays the dev entry point: compiler, CLI, web runtime. Native
binaries are built from `native/` and shipped later as optional platform
packages (the esbuild pattern), so the main tarball never carries Rust
artifacts.

## Milestones

- **M0 — decision and scaffold** ✅
- M1 — window, wgpu clear, input echo
- M2 — embedded QuickJS, scene patches for rectangles
- M3 — text and a counter example
- M4 — blueprint compiler port; optional rebrand as its own commit
- M5 — virtualized 10k-row list at 60fps
- M6 — packaging (Linux/macOS, then Windows)
- M7 — optional WASM/canvas web backend for the scene runtime

## Risks

| Risk | Mitigation |
|---|---|
| Text/IME quality | cosmic-text, bundled default font, defer IME past the slice |
| QuickJS CPU ceiling | Native hot loops, V8 swap behind the same boundary |
| Rust maintenance | Hard 10k-line budget, no app semantics in the core |
| Binary size | Measure at M1; strip, LTO, single font |
| Two toolchains in one repo | Native code isolated under `native/`; CI jobs split |
| Scope creep into a general UI toolkit | M5 benchmark is the gate; cut to lists/tables/charts if missed |
