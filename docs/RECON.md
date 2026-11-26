# Recon — v2 TSX native rewrite

Date: 2026-11-26

## Baseline

- 756 tests pass (`vitest run`), `tsc --noEmit` clean, tree committed at `cae3fc8`.
- npm package: `@devansharora18/tardisjs@0.0.15`, ESM-first, Rollup build, Commander CLI,
  Vitest + jsdom, Node 22.
- Rust 1.96, gcc, pkg-config, Xvfb, Mesa lavapipe (`lvp_icd`) available.
- Fonts available: Liberation Sans (regular + bold), DejaVu, Montserrat.

## What exists

| Path | Role |
|---|---|
| `src/lexer`, `src/parser` | `.tardis` blueprint lexer and parser |
| `src/compiler` | `.tardis` → DOM JS codegen |
| `src/runtime` | Proxy state, signals, DOM render, 12 optional modules |
| `src/ssr` | mini-DOM string renderer + verified-remount hydration |
| `src/testing` | jsdom mount helpers |
| `src/cli` | init/build/dev/preview/compile/check/doctor/prerender |
| `test` | 34 files, 756 tests |
| `examples` | 19 `.tardis` demo sites |
| `tardisjs-site` | 25-page `.tardis` docs site |
| `vscode-extension` | `.tardis` grammar, 22 snippets |
| `bench` | VDOM comparison harness |

## What the task touches

The directive is a breaking v2: **TSX only**, native renderer, no `.tardis`
surface, no concern for existing users. That replaces the entire surface and
rendering stack, not an additive feature:

- New: TypeScript JSX compiler, scene runtime, Rust core (layout/text/raster/JS
  host), native CLI, native example.
- Reused: signals implementation, fs/error CLI helpers, npm/Rollup/Vitest
  infrastructure.
- Removed: lexer, parser, blueprint compiler, web runtime, SSR, testing helpers,
  v1 demos, v1 docs site, `.tardis` VSCode grammar.

## Risks

1. **QuickJS embedding** (`rquickjs`) needs a C toolchain and adds build time.
   Mitigation: add it only after the Rust core runs headless; keep the host
   boundary to two functions.
2. **Crate API drift** (taffy, cosmic-text, softbuffer, winit). Mitigation: pin
   versions, verify signatures from the fetched crate sources before coding.
3. **Layout correctness** for flex + text wrapping. Mitigation: scene-dump JSON
   with computed rects asserted in tests, plus PNG output for visual proof.
4. **Protocol v0 as JSON** costs throughput. Accepted for the vertical slice; the
   op set is stable so v1 binary encoding is a drop-in.
5. **Removing v1** is destructive. Git history preserves it; the rewrite is
   explicit in ADR 0003.

## Environment commands

- JS: `npm test`, `npm run typecheck`, `npm run build`
- Rust: `cargo test --manifest-path native/Cargo.toml`
- Native smoke: `cargo run -p tardis-native -- --headless ...`

## Cross-platform correction (2026-11-26)

Targets are **Linux, macOS, Windows, and web**. Mobile is explicitly deferred.

Current state at the start of this pass:

- The native core (winit, softbuffer, taffy, cosmic-text, tiny-skia, QuickJS) is
  cross-platform code, but only Linux/X11 has been run here. macOS and Windows
  compile paths are unverified.
- There is no web target. The scene runtime emits patches to `__tardis_flush`;
  only the QuickJS host consumes them.
- CLI/build scripts contain Unix-only commands (`rm -rf`, `chmod`), and the
  native end-to-end test assumes a binary name without `.exe`.
- No CI matrix exists.

## Web approach

A DOM adapter consumes the same scene patch stream:

- view/text/image/scroll → `<div>`/`<img>` with CSS flex properties,
- fragments → `display: contents`,
- pointer events delegated from the container to `dispatchEvent`,
- the generated HTML shell provides `#app` and dark page defaults.

The same TSX entry works on native and web by importing the web module for its
side effect; in QuickJS `typeof document === 'undefined'`, so it is a no-op.

## Risks

1. **Layout parity.** Native uses taffy; web uses CSS flex. Box sizing, line
   heights, and font metrics can differ. Mitigation: `box-sizing: border-box`,
   explicit line heights on block text, jsdom assertions on structure/styles.
2. **DOM event mapping.** Native hit-tests; web uses `closest('[data-tardis]')`.
   Mitigation: the runtime already bubbles to the nearest clickable ancestor.
3. **CI platform coverage.** macOS/Windows GUI cannot be exercised here.
   Mitigation: compile and test in a CI matrix; log GUI smoke commands in TODO.
4. **Bundle divergence.** Two targets could drift. Mitigation: one compiler,
   one runtime, one patch protocol; only the host differs.
