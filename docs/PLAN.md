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
