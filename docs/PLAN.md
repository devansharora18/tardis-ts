# Plan — v2 TSX native rewrite

Status: v0 delivered 2026-11-26. Definition of done met: a TSX app compiles,
runs in QuickJS, lays out, rasterizes headlessly and in a window, and responds to
clicks; the old `.tardis` surface is gone; build, typecheck, and tests are clean.

## Delivered

1. **Signals with owner scope** — `createRoot`, `onCleanup`, effect disposal.
2. **TSX compiler** — TypeScript transformer; getters for dynamic props,
   dynamic children, fragments, events/key/ref unwrapped, whitespace rules.
3. **Scene runtime** — view/text/image/scroll/fragment nodes, typed styles,
   patch buffer, dynamic regions, keyed `key` capture (reuse deferred).
4. **Bundler** — esbuild plugin, IIFE output, scoped runtime alias.
5. **Rust core** — patch decode (atomic), taffy layout with fragment flattening,
   cosmic-text measurement/shaping with bundled fonts, tiny-skia raster/PNG,
   hit testing.
6. **QuickJS host** — `__tardis_flush`/`__tardis_event`, console shim.
7. **Native CLI** — headless PNG/scene dump/click, winit + softbuffer window.
8. **Node CLI** — init/build/run/dev/screenshot, entry resolution, binary lookup.
9. **Example + e2e** — counter app; compile → QuickJS → layout → click → assert
   `Count: 1`; PNGs verified.
10. **v1 removal** — lexer, parser, blueprint compiler, web runtime, SSR,
    testing helpers, 19 demos, docs site, VSCode grammar, bench.
11. **Docs** — README, TSX guide, architecture, protocol, decisions, ADR 0003.

## Deviations from the original plan

- The renderer is CPU tiny-skia, not wgpu. The renderer boundary is in place;
  wgpu is M7.
- Keyed list reuse is deferred. Dynamic arrays rebuild; `key` is captured for
  future reconciliation.
- The window is verified under Xvfb; pointer input is automated through the
  headless `--click` path rather than a GUI driver.
- The v1 docs site and demos were removed instead of ported. New docs are
  Markdown under `docs/`.

## Next

- M5: virtualized 10k-row list, frame timing, benchmark against a DOM baseline.
- M6: macOS/Windows builds, npm platform binary packages.
- M7: wgpu backend behind `paint.rs`.
- Then: keyboard/focus/IME, images, scroll painting, text clipping, HiDPI.

## Cross-platform follow-up (2026-11-26)

Targets: Linux, macOS, Windows, web. Mobile deferred.

1. **Web DOM host** — apply the patch stream to DOM, map styles to CSS, delegate
   pointer events, auto-install on `#app`, no-op without `document`.
2. **Web bundler** — `bundleApp({ target: 'web' })` with a browser IIFE and a
   generated `index.html` shell.
3. **CLI** — `build --target web`, `preview`, `dev --target web` (watch +
   rebuild + reload), cross-platform npm scripts.
4. **Package** — `./web` export, Rollup entry, types.
5. **Tests** — jsdom host tests, web bundle end-to-end (render + click),
   dev-server tests; native e2e keeps working with the web import.
6. **CI** — Linux/macOS/Windows matrix: typecheck, tests, build, cargo tests.
7. **Docs** — target matrix, web quick start, ADR 0004, TODO host checks.

## Cross-platform result

Delivered after the follow-up plan:

- Web DOM host (`src/web`), auto-installed on `#app`; no-op in QuickJS.
- `bundleApp({ target: 'web' })` with a generated `index.html` shell.
- CLI: `build --target web`, `dev --target web` (watch + rebuild + reload),
  `preview`; cross-platform npm scripts.
- `./web` package export and Rollup entry.
- jsdom host tests, web bundle end-to-end (render + click), static server tests.
- Chrome smoke check rendered the web build with the counter.
- CI matrix for Linux, macOS, and Windows.
- Docs: target matrix, TSX web notes, ADR 0004.

Deviations: web layout is CSS, so pixel parity with native is not guaranteed;
web SSR/hydration remains future work; mobile is deferred.

## M5 performance run (2026-11-27)

Milestone: measured native performance with a repeatable harness, then close the
known costs. No "better than Dioxus" claim without a fair head-to-head.

1. **Benchmark crate** — `native/crates/bench`: scenes of 100/1,000/10,000 rows;
   measure mount, single-text update, single-style update, relayout, and paint.
   JSON output; five runs; median and p95.
2. **Zero-clone patches** — validate style/text-only patches first, then apply in
   place. Structural patches keep the atomic clone path. Tests for atomicity.
3. **Incremental layout** — keep the taffy tree; on style/text-only patches call
   `set_style`/`mark_dirty`, then recompute. Rebuild only on structural changes.
4. **Text** — measurement cache keyed by (text, size, weight, max width); direct
   glyph mask blending into the target pixmap, no per-glyph `Pixmap`.
5. **Paint culling** — skip fully offscreen text/image nodes and contained views;
   record the viewport in `RenderOptions`.
6. **10k-row app** — benchmark the full TSX → QuickJS → patches → layout → paint
   path with a native `--bench` hook.
7. **Targets** — 10k-row single update p95 ≤ 16.6 ms; visible paint ≤ 8 ms;
   mount ≤ 500 ms. These are gates, not marketing numbers; publish actuals.
8. **Dioxus** — desktop startup/binary baseline where measurable; web blocked by
   missing wasm toolchain, log host commands. No claim without both sides.
9. **Tests/docs** — regression tests, benchmark report, README, TODO.

## M5 result (2026-11-27)

- Zero-clone style/text patches, persistent taffy tree, paint culling/clipping,
  direct glyph blending, and a virtual list are in.
- 1k update: 50.1 ms → 1.97 ms. 10k fully mounted update: 594.6 ms → 23.0 ms.
  10k paint: 150.0 ms → 1.87 ms. Virtualized 10k window: 0.55 ms update, 3.1 ms
  mount.
- Gate status: virtualized 10k passes the 16.6 ms frame budget; a fully mounted
  10k-node scene still takes 23 ms for one update and remains a stress case.
- Dioxus 0.6.3 desktop startup/binary baseline: Tardis 451 ms / 7.3 MB vs Dioxus
  625 ms / 8.7 MB (first paint, Xvfb, release). This is a startup/size win only;
  no frame-time head-to-head, and the web arm is blocked without
  wasm-bindgen/dx. No blanket "better than Dioxus" claim.

## Production input/a11y slice (2026-11-27)

1. **Semantic tags** — add `tag` to create ops; web maps intrinsic tags to
   `<button>`, `<h1>`, `<p>`, `<ul>`, `<li>`, `<label>`, `<strong>`, `<em>`,
   `<img>` (native ignores it). Tests assert real elements.
2. **A11y props** — `role`, `tabIndex`, and `aria-*` become an `a11y` patch op;
   web sets attributes; native stores them for a future accesskit tree. Reactive
   getters supported. Tests.
3. **Focus/blur** — pointer down fires `onPointerDown`, `onFocus`, and the
   previous node's `onBlur`; pointer up fires `onPointerUp` and the click.
4. **TextField** — controlled/uncontrolled single-line input with caret,
   arrows/Home/End/Backspace/Delete, printable keys, Enter ignored, and
   Ctrl/Cmd+C/X/V. `role="textbox"`, `aria-label`, `tabIndex=0`.
5. **Clipboard** — in-memory + `navigator.clipboard` on web; native host
   functions using `arboard` when a display is available.
6. **Example + docs + tests** — `examples/forms`, jsdom tests, native e2e still
   green. IME, selection, multiline, accesskit: TODO.

## Input/a11y slice result (2026-11-27)

- Semantic tags in create ops; web emits `<button>`, `<h1>`, `<p>`, `<ul>`,
  `<li>`, `<label>`, `<strong>`, `<em>`, `<img>`.
- `role`/`tabIndex`/`aria-*` via an `a11y` op; web attributes, native storage.
- Focus lifecycle: pointerdown/focus/blur/pointerup/click.
- `TextField` (single-line caret editing, clipboard) and `Checkbox`; native
  `arboard` + web `navigator.clipboard` bridges.
- Forms example renders natively; 82 JS / 11 Rust tests.
- Still deferred: selection, multiline, IME, native accesskit, form validation.

## Forms/resource result (2026-11-27)

- `createForm`: values, touched, errors, submitting, submitted, submit, reset,
  per-field bindings; errors after touch/submit.
- `FormField`: label + control + error/hint.
- `createResource`: loading/error/refetch; last request wins; owner disposal.
- Forms example uses validation and async submit.
- 88 JS / 11 Rust tests.
- Deferred: selection/multiline/IME, nested form arrays, abortable fetches,
  native accesskit.

## SSR/hydration result (2026-11-27)

- `renderToString` / `renderDocument` via a DOM-free StringHost.
- `hydrate` verified remount: staging render, text comparison, warning/onMismatch,
  listener/root move to the real container.
- Shared `web/style.ts` and `web/tags.ts` keep server and client markup aligned.
- `tardisjs/ssr` subpath export and bundle.
- 93 JS / 11 Rust tests.
- Deferred: streaming, node adoption, data prefetch, server-bundle CLI.

## Renderer/tooling slice result (2026-11-27)

- `ScrollView`: wheel scrolling, clipping, indicator bar, controlled offsets.
- `Boundary`: render-time error fallback with reset; effect errors remain logged.
- HiDPI: logical layout + scaled raster/text/bounds; window scale/input handling;
  headless `--scale` (200×100 logical → 400×200 PNG verified).
- 12 Rust / 97 JS tests (full suite re-run below).
- Still open: wgpu, accesskit, draggable scrollbars, ellipsis, platform binaries,
  Dioxus frame benchmark, IME/selection.

## Input slice result (2026-11-27)

- Selection: shift+arrows/Home/End, Ctrl/Cmd+A, copy/cut selection, delete/replace
  selection, collapse on plain movement.
- Multiline: `multiline`/`rows`, per-line rendering, Enter newline,
  Ctrl/Cmd+Enter submit, vertical movement with goal column, per-line Home/End.
- Navigation: Alt+arrows by word, Ctrl/Cmd+Home/End document ends.
- Native: text-node backgrounds paint behind glyphs so selection is visible.
- 107 JS / 13 Rust tests. Still open: IME, pointer caret placement, focus tree.

## Focus/IME slice result (2026-11-27)

- Tab/Shift+Tab traverse scene tabbables in document order and skip disabled nodes.
- Web IME: hidden offscreen textarea focused with the scene field; composition
  preedit renders at the caret; commit inserts text. Tab is routed to scene focus.
- Native IME: winit IME enabled; preedit/commit/disabled map to `text` events.
- 110 JS / 13 Rust tests. Still open: native accesskit tree, pointer caret.
