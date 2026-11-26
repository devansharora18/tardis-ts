# Cross-platform architecture

Targets: Linux, macOS, Windows, and web. Mobile is deferred.

Status: native v0 verified on Linux (window + headless), web DOM backend
verified in Chrome and jsdom, macOS/Windows compile and test in CI. wgpu and
platform packaging are next.

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
- **Events** — pointer down/up, wheel, keyboard, focus/blur; pointer down
  focuses and fires `onPointerDown`/`onFocus`; the previous node gets `onBlur`.
- **Forms** — `TextField` (caret, selection, multiline, clipboard) and
  `Checkbox`. Selection runs paint as text-node backgrounds.
- **A11y** — `role`/`tabIndex`/`aria-*` travel in an `a11y` patch op; web applies
  DOM attributes and semantic tags; native stores them for accesskit.
- **VirtualList** — visible-window windowing with wheel scrolling; ~40 nodes for
  10,000 rows.
- **ScrollView** — absolute inner offset + parent clipping + scrollbar indicator.
- **Boundary** — render-time try/catch with fallback/reset.
- **Form state** — `createForm` values/touched/errors/submitting; `FormField`.
- **Resources** — `createResource` loading/error/refetch with last-request-wins.
- **Router** — path signal, `:param` matching, memory or browser history.
- **Patches** — JSON ops flushed once per microtask and after events.

### 4. Bridge

The embedded QuickJS host installs two globals:

- `__tardis_flush(json)` — apply a scene patch.
- `__tardis_event(json)` — dispatch input.

The protocol is documented in [protocol.md](protocol.md). v0 uses JSON; the op
set is stable so a binary encoding is a transport change, not a redesign.

### 4c. Server rendering (`src/ssr/`)

`renderToString` installs a StringHost that consumes the same patch stream and
serializes semantic HTML with inline styles, role/aria, and the shared
`defaultStyle`/`rootStyle` tables. No DOM is needed. `renderDocument` wraps the
fragment with base CSS.

`hydrate` renders into a staging WebHost, compares text content, warns on
mismatch, then moves the live root and listeners to the real container. This is
a verified remount, not server-node adoption; there is no streaming or data
prefetch.

### 4b. Web host (`src/web/`)

The same patch stream is applied to DOM elements:

- `view`/`scroll` → `<div>` with `display: flex`,
- `text` → `<div>` with `white-space: pre-wrap`,
- `image` → `<img>`,
- `fragment` → `<div>` with `display: contents`,
- styles → CSS properties; `box-sizing: border-box` matches taffy sizing.

Pointer events are delegated from the container: `closest('[data-tardis]')` gives
the scene node id, then the runtime's `dispatchEvent` handles bubbling to the
nearest clickable ancestor. The app imports the web module for its side effect;
in QuickJS there is no `document`, so it is a no-op.

### 5. Rust core (`native/crates/core`)

- `taffy` — flexbox layout; fragments are flattened into the nearest parent.
- `cosmic-text` — shaping, wrapping, and measurement with bundled Liberation
  Sans regular/bold.
- `tiny-skia` — rounded rectangles, direct glyph-mask blending, PNG images and
  output. Paint culls offscreen subtrees, clips `overflow: hidden` views, and
  scales raster/text/bounds by the device pixel ratio while layout stays logical.
- Patches apply atomically to a clone; invalid ops leave the scene untouched.
- Hit testing walks the laid-out tree in reverse paint order.

**Budget: ≤10k lines, no application semantics.** Current: ~2.2k lines.

### 6. Host and shell

- `native/crates/js` — rquickjs runtime, console shim, patch/event bridge.
- `native/crates/cli` — `tardis-native`:
  - `--headless --out frame.png --dump scene.json [--click x,y]`
  - window mode: winit + softbuffer, resize, pointer events.
- `src/cli` (Node) — builds native/web bundles, locates the binary, spawns it,
  serves web previews, and watches files for `tardis dev`.
- `src/web` — DOM host for the web target.

## Frame loop

```
native input ──▶ JS handlers ──▶ signal writes
                                      │
                               microtask flush
                                      │
                          scene diff → patch JSON
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
   taffy layout → tiny-skia → present/PNG        DOM host → CSS layout → paint
```

Input is dispatched synchronously; the runtime flushes patches before the host
returns. The renderer never sees a half-updated tree. Web pointer events call
the same `dispatchEvent` path, so handler semantics match.

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
    compiler/        tsx transformer + esbuild bundler (native + web)
    scene/           signals, jsx, tree, mount, render
    web/             DOM patch host + shared style/tag tables
    ssr/             string host, document shell, hydration
    cli/             build/run/screenshot/dev/preview/init
  native/
    crates/core/     scene, patch, layout, text, paint
    crates/js/       QuickJS host
    crates/cli/      tardis-native binary
  test/
    compiler/        transformer + bundler + web bundle
    scene/           signals + runtime patches
    web/             DOM host
    cli/             native end-to-end + static server
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
- **M8 — web DOM backend** ✅ (Chrome + jsdom, dev/preview)
- M7 — wgpu renderer behind the same interface
- Mobile — deferred

## Risks

| Risk | Mitigation |
|---|---|
| Text/IME quality | Bundled fonts; IME deferred past the slice |
| QuickJS CPU ceiling | Native hot loops; V8 swap behind the same boundary |
| Rust maintenance | Hard 10k-line budget, no app semantics |
| CPU raster cost | wgpu backend behind the renderer boundary |
| Two toolchains | `native/` isolated; CI splits JS and Rust jobs |
| Native/web layout drift | Shared styles; explicit line heights; box-sizing; jsdom structure tests |
| macOS/Windows GUI untested here | CI compiles/tests; GUI smoke commands in TODO |
| Scope creep | M5 benchmark is the gate; mobile deferred |
