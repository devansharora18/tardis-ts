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
