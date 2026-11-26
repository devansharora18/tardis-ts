# 0004 — Web target uses a DOM patch adapter

Status: accepted    Date: 2026-11-26    Deciders: Devansh Arora
Supersedes: the web-deferred consequence of ADR 0003

## Context

The target set is Linux, macOS, Windows, and web. Mobile is deferred. The
native runtime already emits a platform-neutral scene patch stream; only the
QuickJS host consumes it. Web needs a second host, not a second compiler.

The alternatives for web were a canvas/WASM renderer or a DOM renderer. A canvas
renderer would match native pixels more closely but loses text selection,
accessibility, and native browser scrolling, and it needs a WASM build of the
layout/text stack. A DOM renderer reuses the browser's layout, text, and
accessibility and ships no WASM.

## Options

1. **DOM patch adapter** (chosen). Map view/text/image/fragment to DOM elements,
   map scene styles to CSS flex, delegate pointer events. Same bundle entry.
2. **Canvas/WASM renderer.** Compile the Rust core to WASM, draw to canvas.
   Closer to native output, much larger scope, no DOM accessibility.
3. **Separate web compiler.** Emit DOM code directly from TSX. A second backend
   to maintain and a second behaviour surface.
4. **React/webview shell.** No; it abandons the native renderer thesis.

## Decision

Option 1. `src/web/` implements `WebHost`, which applies the same patch ops:

- `view`/`scroll` → `<div>` with `display: flex`,
- `text` → `<div>` with `white-space: pre-wrap`,
- `image` → `<img>`,
- `fragment` → `<div>` with `display: contents`,
- styles → CSS properties (`box-sizing: border-box` to match taffy),
- pointerdown/pointerup delegated to `closest('[data-tardis-ts]')` and forwarded to
  the runtime's `dispatchEvent`.

The app imports `@devansharora18/tardis-ts/web` for its side effect. In QuickJS
`typeof document === 'undefined'`, so the import is a no-op and the native host
keeps `__tardis_ts_flush`.

`tardis-ts build --target web` emits a browser IIFE plus a generated `index.html`.
`tardis-ts dev --target web` serves it and reloads after rebuilds.

## Consequences

- Web layout is CSS flex, not taffy. Font metrics and line breaks can differ.
- Web has no SSR/hydration yet; it is a client-rendered target.
- The native bundle contains the web module (guarded) and grows slightly.
- Web is DOM-bound; heavy 10k-row surfaces will need virtualization.
- Mobile remains out of scope for this stage.
- The native macOS/Windows GUI paths still need host smoke tests; CI covers
  compilation and headless tests.

## Revisit

Add SSR by rendering the scene tree to HTML and hydrating with the same DOM
host. Add a canvas backend only for specific heavy surfaces (large grids,
charts), not as the general web target.
