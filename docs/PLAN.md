# Plan — v2 TSX native rewrite

## Definition of done

A TSX app compiles to a JS bundle, runs in an embedded QuickJS inside a Rust
binary, lays out with flexbox, rasterizes text and boxes, and produces a PNG
headlessly. Window mode compiles and opens on a display. The old `.tardis`
surface is gone from the package. Build, typecheck, and tests are clean.

## Steps

1. **Signals owner scope** — add `createRoot`, `onCleanup`, and an owner stack to
   `src/scene/signals.ts` (ported from `src/runtime/signals.ts`) so dynamic
   regions and components dispose effects. Tests.
2. **TSX compiler** — `src/compiler/tsx.ts`. TypeScript transformer:
   - `{}` children → `dynamic(() => expr)`
   - non-event attributes → getters; event props (`/^on[A-Z]/`), `key`, `ref`,
     and function-valued props stay unwrapped
   - intrinsic tags stay strings; fragments → `Fragment`
   - inject `import { jsx, dynamic, Fragment } from "tardisjs/scene"`
   - whitespace collapse rule: newline-containing text is trimmed, inline
     spaces preserved
   Tests for every rule.
3. **Scene runtime** — `src/scene/`:
   - node kinds `view | text | image | scroll | fragment`
   - intrinsic map: `div → view`; `span,p,h1..h6,label,strong,em → text`;
     `button → pressable view`; `img → image`
   - defaults: `view` flex column, `text` fontSize 16/color #ededed,
     `h1` 32/800, `h2` 26/800, `h3` 21/700, `button` padding 10x16, radius 8
   - ops: `create`, `destroy`, `insert`, `style`, `text`, `image`, `scroll`
   - flush: microtask, JSON per protocol v0, one `__tardis_flush` call
   - events: `__tardis_event` → node handler lookup
   - keyed reconcile by `key`, index fallback
   Tests with a fake host.
4. **Bundler** — `src/compiler/bundle.ts` using esbuild with the TSX plugin,
   output IIFE, alias `tardisjs/scene` to `src/scene/index.ts`.
5. **Rust core** — `native/crates/core`:
   - scene + JSON patch decode (invariants from protocol)
   - taffy layout, fragments flattened
   - cosmic-text measurement + shaping, bundled Liberation Sans
   - tiny-skia raster: background, radius, clip, text
   - `render_to_png`, `dump_scene` JSON
   Unit tests: decode, layout positions, text wrap, pixel non-empty.
6. **Native host** — `native/crates/js` (rquickjs) with `__tardis_flush` and
   `__tardis_event`; `native/crates/cli` headless mode first, then window mode
   (winit + softbuffer, feature `window`).
7. **Node CLI** — `tardis build` (bundle), `tardis run` (spawn binary),
   `tardis screenshot`, `tardis dev` (watch + rerun). Package exports `./scene`,
   `./compiler`; bin `tardis`.
8. **Example** — `examples/native-counter/app.tsx` with a counter and a keyed
   list; e2e test builds it, runs headless, asserts scene dump + PNG.
9. **Remove v1** — delete lexer/parser/blueprint compiler/web runtime/SSR/
   testing/old CLI commands/old tests/19 demos/docs site/VSCode grammar.
   Add ADR 0003.
10. **Hardening + docs** — README, docs/TSX.md, architecture update, eslint-free
    typecheck, full test run, `npm pack --dry-run`, clean tree.

## Exact protocol constants

- Root id `0`; ids start at `1`.
- Patch flush: one JSON object per microtask; `frame` increments.
- Style values: numbers are points; colors `#rrggbb`/`#rrggbbaa`.
- Default viewport in headless: 800×600.
- Text default: 16px / line-height 1.4 / #ededed.
- PNG background: #0a0a0a.
