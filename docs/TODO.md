# TODO

## RUN ON HOST

These need a real desktop session, credentials, or hardware this environment
does not have.

```sh
# macOS / Windows native window smoke (Linux is verified under Xvfb)
npm ci
npm run build
cargo build --release --manifest-path native/Cargo.toml
node dist/bin/tardis-ts.js run examples/native-counter/app.tsx
# verify: window opens, clicks/keys/IME work, resize/scale relayouts,
# and a screen reader reads the AccessKit tree

# Web in Safari and Firefox (Chrome 155 and jsdom are verified here)
node dist/bin/tardis-ts.js build examples/native-counter/app.tsx --target web
node dist/bin/tardis-ts.js preview
# open the URL, click Increment, Tab through controls, open a Dialog

# Platform binary smoke after the first publish
npm i @devansharora18/tardis-ts@alpha
npx tardis-ts screenshot examples/native-counter/app.tsx -o check.png
# must not require Rust or cargo
```

- Add `NPM_TOKEN` to repository secrets, configure macOS/Windows signing
  secrets (see [PACKAGING.md](PACKAGING.md)), tag `v*`, and verify the release
  workflow publishes all platform packages.
- Verify Gatekeeper/SmartScreen behavior on signed artifacts.
- Verify Retina and Windows display scaling (125/150/200%).
- Run axe and a screen-reader pass on the web host.

## Platforms

- **Mobile (iOS/Android)** — explicitly deferred. Needs a native view host,
  touch/IME, safe areas, and app packaging.
- **Windows arm64** — no platform package yet; x64 only.
- **Web** — Chrome and jsdom verified; add Safari/Firefox to a browser matrix.
- **Streaming SSR / data prefetch** — hydration adopts nodes, but there is no
  streaming renderer or server-bundle/prerender command.

## Renderer

- **GPU geometry/text** — the wgpu backend presents CPU-rasterized frames. A
  real GPU pipeline for rectangles, glyphs, and images is the next large step.
- **Pointer caret placement** — selection is keyboard-driven in `TextField`.
- **Touch scrolling** — touch maps to pointer events, but drag-to-scroll is not
  implemented.
- **Multiline ellipsis / measured ScrollView height** — single-line ellipsis and
  explicit content height exist.
- **Image formats** — native decodes PNG only; add JPEG/WebP/SVG and verify
  `fit: cover|contain|fill`.
- **Animations** — no transition/animation scheduler.
- **Portals** — dialogs are absolute overlays inside the root, not true portals.
- **Z-index/transforms/shadows** — not implemented.
- **Multiple windows** — one window per process.
- **Core panic boundary** — a Rust panic is not yet converted into a rejected
  patch + last-frame fallback.

## Applications

- **Editor** — replace the per-line highlighter with tree-sitter/LSP, and add
  find/replace, multi-cursor, undo, Git, and a terminal. Current UI: activity
  bar, explorer, tabs, breadcrumbs, command palette, minimap, status bar.
- **Spreadsheet** — direct in-cell typing, horizontal scrolling, scroll-to-active,
  and CSV import. Clipboard ranges, CSV export, undo/redo, formatting, sorting,
  and multiple sheets are implemented.
- **Word** — rich text, page breaks, comments, DOCX import/export. Markdown
  source, tables, margins, spacing, and export are implemented.
- **Slides** — transitions, animations, charts, and image placeholders.
- **Paint** — layers, shape tools, selection, and native file dialogs.
- **PDF** — a desktop build and native file dialogs (web-only today).
- **Weather / Chat** — streaming responses and retry/cancel controls.
- **Zed typing latency** — not measured; only startup, RSS, size, and features.

## Performance

- **Web full-list update** — Dioxus is ~1.54x faster on 10k mounted rows. Add a
  raw-text-node fast path and effect batching, then re-run
  `bench/web-frame/run.mjs`.
- **Virtualized spreadsheet** — measured a tie: Tardis 60.2 fps vs Dioxus
  60.3 fps on 100k rows. See [SHEETS.md](SHEETS.md).
- **Native frame comparison with Dioxus** — desktop paint timing is not exposed
  by Dioxus' webview.
- **Glyph atlas / shaped-buffer cache** — re-measure after the text fast path.

## Correctness

- **Web accessibility audit** — roles/ARIA exist for built-ins; run axe and fix
  custom-widget gaps.
- **Native screen-reader pass** — the AccessKit tree exists; verify VoiceOver,
  Narrator, and Orca output.
- **Layout parity** — audit box sizing, line heights, font metrics, and wrapping
  against a shared scene dump.
- **Form arrays/nested fields and schema adapters** — flat fields, async
  validation, and submit errors are implemented.

## Developer experience

- Hot reload with state preservation (current `dev` restarts the app).
- TSX source maps for browser and native bundles.
- `tardis inspect` to print the running scene tree.
- Playwright end-to-end tests for the web app in CI (the benchmark runner uses
  Playwright but is not a UI regression suite).
- Devtools time travel, owner/component view, and a network/resource panel.
- API reference generation from the TypeScript declarations (the site itself is
  already built in Tardis TS).
- Migration note from `.tardis` blueprints to TSX (v1 remains in git history).

## Known honest gaps in claims

- Line count is ~25k framework/examples/site/tests/docs/bench, not 40k. No
  padding is added.
- The office-grade UI pass is implemented; the capability gaps above remain and
  are not hidden behind the visual polish.
- The Dioxus web full-list benchmark is a measured loss, published in
  [BENCHMARKS.md](BENCHMARKS.md). The 100k virtualized sheet comparison is a tie,
  published in [SHEETS.md](SHEETS.md). The editor beats Zed on startup/memory/
  size and loses on features, published in [EDITORS.md](EDITORS.md).
