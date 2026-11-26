# Native target architecture

Status: v0 implemented on Linux. TSX surface, embedded QuickJS, CPU raster
renderer. wgpu and platform packaging are next.

## Layers

### 1. Surface

TSX with signals. The compiler emits scene calls; no runtime parser and no
custom file type ships.

### 2. Compiler (`src/compiler/`)

A TypeScript `before` transformer rewrites JSX to `_tjsx(...)` calls and wraps
dynamic expressions in `_tdynamic(() => expr)`. It runs inside
`ts.transpileModule`; esbuild resolves modules and produces the IIFE bundle.
There is no second grammar.

### 3. JS runtime (`src/scene/`)

- **Signals** — push-pull graph, lazy computeds, effects batched per microtask,
  owner scopes for disposal.
- **Scene tree** — retained nodes with integer ids and typed style records.
- **Dynamic regions** — fragments whose children are reconciled in an effect;
  each evaluation gets a fresh owner.
- **Events** — pointer down/up, nearest clickable ancestor.
- **Patches** — JSON ops flushed once per microtask and after events.

### 4. Bridge

The embedded QuickJS host installs two globals:

- `__tardis_flush(json)` — apply a scene patch.
- `__tardis_event(json)` — dispatch input.

The protocol is documented in [protocol.md](protocol.md). v0 uses JSON; the op
set is stable so a binary encoding is a transport change, not a redesign.

### 5. Rust core (`native/crates/core`)

- `taffy` — flexbox layout; fragments are flattened into the nearest parent.
- `cosmic-text` — shaping, wrapping, and measurement with bundled Liberation
  Sans regular/bold.
- `tiny-skia` — rounded rectangles, glyph masks, PNG output.
- Patches apply atomically to a clone; invalid ops leave the scene untouched.
- Hit testing walks the laid-out tree in reverse paint order.

**Budget: ≤10k lines, no application semantics.** Current: ~2.2k lines.

### 6. Host and shell

- `native/crates/js` — rquickjs runtime, console shim, patch/event bridge.
- `native/crates/cli` — `tardis-native`:
  - `--headless --out frame.png --dump scene.json [--click x,y]`
  - window mode: winit + softbuffer, resize, pointer events.
- `src/cli` (Node) — builds the bundle, locates the binary, spawns it, watches
  files for `tardis dev`.

## Frame loop

```
native input ──▶ JS handlers ──▶ signal writes
                                      │
                               microtask flush
                                      │
                          scene diff → patch JSON
                                      │
                     taffy layout → tiny-skia → present/PNG
```

Input is dispatched synchronously; the runtime flushes patches before the host
returns from `__tardis_event`. The renderer never sees a half-updated tree.

## Threading

Everything runs on the UI thread in v0: winit event loop, QuickJS, layout, and
raster. That is the simplest correct model. Layout/raster can move to a render
thread after the patch format is stable.

## Performance budget (60fps = 16.6ms)

| Stage | Budget |
|---|---|
| JS handlers + signal flush | 2.0ms |
| Patch decode | 1.0ms |
| Layout | 2.0ms |
| Text shaping | 2.0ms |
| Raster and present | 3.0ms |
| Slack | 6.6ms |

No benchmark suite exists yet. M5 is a 10k-row virtualized list gate.

## Repository layout

```
tardisjs/
  src/
    compiler/        tsx transformer + esbuild bundler
    scene/           signals, jsx, tree, mount, render
    cli/             build/run/screenshot/dev/init
  native/
    crates/core/     scene, patch, layout, text, paint
    crates/js/       QuickJS host
    crates/cli/      tardis-native binary
  test/
    compiler/        transformer + bundler
    scene/           signals + runtime patches
    cli/             native end-to-end
  examples/native-counter/
  docs/
```

## Milestones

- **M0 — decision and scaffold** ✅
- **M1 — window, input** ✅ (Xvfb verified)
- **M2 — QuickJS + patches** ✅
- **M3 — text + counter** ✅
- **M4 — TSX compiler** ✅
- M5 — virtualized 10k-row list at 60fps + benchmark
- M6 — packaging (Linux/macOS, then Windows), npm platform binaries
- M7 — wgpu renderer behind the same interface
- M8 — optional web backend via a scene-to-DOM adapter

## Risks

| Risk | Mitigation |
|---|---|
| Text/IME quality | Bundled fonts; IME deferred past the slice |
| QuickJS CPU ceiling | Native hot loops; V8 swap behind the same boundary |
| Rust maintenance | Hard 10k-line budget, no app semantics |
| CPU raster cost | wgpu backend behind the renderer boundary |
| Two toolchains | `native/` isolated; CI splits JS and Rust jobs |
| Scope creep | M5 benchmark is the gate |
