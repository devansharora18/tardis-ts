# TODO

## RUN ON HOST

These need a real desktop session, a second browser, or credentials this
environment does not have.

```sh
# macOS / Windows native window smoke (Linux is verified under Xvfb)
npm install
npm run build
cargo build --manifest-path native/Cargo.toml
node dist/bin/tardis.js run examples/native-counter/app.tsx
# verify: window opens, button increments, resize relayouts

# Web in Safari and Firefox (Chrome and jsdom are verified here)
node dist/bin/tardis.js build examples/native-counter/app.tsx --target web
node dist/bin/tardis.js preview --dir examples/native-counter/dist/web
# open the URL, click Increment, check the layout

# Native binary package smoke, once platform packages exist
npm publish --tag alpha
```

## Platforms

- **Mobile (iOS/Android)** — explicitly deferred. Requires a native view host,
  touch/IME, safe areas, and platform packaging.
- **macOS/Windows native** — CI compiles/tests; GUI smoke is a host check above.
- **Web** — Chrome and jsdom verified. Add Safari/Firefox to a browser matrix.
- **Web SSR/hydration** — render the scene tree to HTML, hydrate with the DOM
  host. No SSR exists today.

## Packaging

- Build npm platform packages (`tardis-native-linux-x64`, `-darwin-arm64`,
  `-win32-x64`) as optional dependencies, the esbuild/swc pattern. Until then the
  tarball ships the Rust sources and the user builds once with cargo.
- Include the license for the bundled Liberation fonts in release artifacts
  (already in `native/crates/core/assets/LICENSE-Liberation.txt`).
- Add `tardis doctor` to report missing binary, Rust, display, fonts, and target.
- Add release binaries to the CI matrix (the matrix exists; upload artifacts and
  attach them to releases).

## Performance

- M5 benchmark: native 10k-row virtualized list, mount/update/scroll frame
  times, compared with a DOM baseline.
- Web virtualization for large lists; the DOM host is not virtualized.
- Keyed reconciliation for dynamic arrays (reuse nodes by `key`, emit moves).
- Incremental layout instead of rebuilding the taffy tree per patch.
- Glyph atlas: cache shaped buffers and glyph pixmaps across frames.
- Move layout/raster to a render thread after the patch format is frozen.
- wgpu backend behind the `paint.rs` boundary.

## Correctness

- Native/web layout parity: audit box sizing, line heights, font metrics, and
  wrapping against the same scene dump.
- Text clipping (`overflow: hidden`) and ellipsis.
- Image sizing (`fit: cover|contain|fill`) and formats beyond PNG.
- Scroll containers with scrollbars; VirtualList currently windows itself via
  wheel offsets.
- HiDPI: pass `scale_factor` through layout, text, and pointer coordinates
  (native windows are 1x today).
- Text selection, multiline fields, IME composition, and a spatial focus tree.
  Basic single-line TextField and clipboard exist.
- Mouse hover/press visual states; web currently has no cursor affordance.
- Window close lifecycle and multiple windows.
- Error boundary for panics in the Rust core (reject patch, keep last frame).
- Web accessibility audit (semantic tags and role/aria exist; run axe and a
  screen-reader pass).
- Native accesskit tree wired from the stored a11y attributes.
- Form validation helpers and error/empty/loading states.

## Developer experience

- Hot re-evaluation of the native bundle without restarting the window.
- Source maps from TSX to both bundles.
- TypeScript JSX namespace declarations for editors (`JSX.IntrinsicElements`).
- `tardis inspect` to print the scene tree from a running app.
- Playwright end-to-end tests for the web target (jsdom covers logic; a real
  browser covers layout and events).
- A Dioxus frame-time head-to-head on the same workloads; only startup/binary
  size is scoped so far.
- Client-side routing for the web target.

## Docs

- Rebuild the documentation site on the TSX stack; the v1 `.tardis` site was
  removed.
- Add a migration note from `.tardis` blueprints to TSX signals (v1 is in git
  history).
- Record short captures of the native window, the web app, and the headless
  screenshot flow.
