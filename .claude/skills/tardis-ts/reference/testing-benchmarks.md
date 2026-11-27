# Testing and benchmarks

```sh
npm test
npx tsc --noEmit
npm run build
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

## Test layout

- `test/scene` — signals, scene tree, inputs, dialogs, router, forms, scroll.
- `test/web` — DOM host, semantics, keyboard, VirtualList.
- `test/ssr` — string rendering and structural hydration.
- `test/cli` — bundle, server, native e2e, scaffolding, prompts.
- `test/examples` — formula, paint PNG, calculator, weather/chat APIs, app builds.
- `native/crates/core/tests` — layout, paint, HiDPI, data URLs, borders.
- `native/crates/cli/src/a11y.rs` — AccessKit tree tests.

## Benchmarks

- `bench/web-frame/run.mjs`: 10k mounted rows, 120 frames, Tardis/Dioxus/React.
- `bench/sheet-frame/run.mjs`: 100k virtualized rows, Tardis/Dioxus.
- `bench/editor` comparison: startup/RSS/size Tardis vs Zed (`docs/EDITORS.md`).
- `bench/electron/run.mjs`: React workload inside Electron over CDP.

Report medians, p95, dropped frames. Never change the workload after seeing a
loss; publish the loss. Current known results are in `docs/BENCHMARKS.md`,
`docs/EDITORS.md`, `docs/SHEETS.md`.
