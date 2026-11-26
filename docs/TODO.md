# TODO

## RUN ON HOST

These need a real desktop session or credentials this environment does not have.
On the host:

```sh
# macOS / Windows window smoke test (Linux is verified under Xvfb)
npm install
npm run build
cargo build --manifest-path native/Cargo.toml
node dist/bin/tardis.js run examples/native-counter/app.tsx

# verify the window opens, the button responds, and resize relayouts
```

Publish the alpha once the native binaries exist:

```sh
npm publish --tag alpha
```

## Packaging

- Build npm platform packages (`tardis-native-linux-x64`, `-darwin-arm64`,
  `-win32-x64`) as optional dependencies, the esbuild/swc pattern. Until then the
  tarball ships the Rust sources and the user builds once with cargo.
- Add a GitHub Actions matrix: Node typecheck/tests + cargo test on Linux,
  macOS, Windows; cache cargo; build release binaries.
- Include the license for the bundled Liberation fonts in release artifacts
  (already in `native/crates/core/assets/LICENSE-Liberation.txt`).
- Add `tardis doctor` to report missing binary, Rust, display, and fonts.

## Performance

- M5 benchmark: 10k-row virtualized list, mount/update/scroll frame times,
  compared with a DOM baseline.
- Keyed reconciliation for dynamic arrays (reuse nodes by `key`, emit moves).
- Incremental layout instead of rebuilding the taffy tree per patch.
- Glyph atlas: cache shaped buffers and glyph pixmaps across frames.
- Move layout/raster to a render thread after the patch format is frozen.
- wgpu backend behind the `paint.rs` boundary.

## Correctness

- Text clipping (`overflow: hidden`) and ellipsis.
- Image decode and sizing (`fit: cover|contain|fill`).
- Scroll containers: painting offsets, wheel events, scrollbars.
- HiDPI: pass `scale_factor` through layout, text, and pointer coordinates.
- Keyboard events, focus tree, IME, clipboard.
- Mouse hover/press visual states.
- Window close lifecycle and multiple windows.
- Error boundary for panics in the Rust core (reject patch, keep last frame).

## Developer experience

- Hot re-evaluation of the bundle without restarting the window.
- Source maps from TSX to the bundled app.
- TypeScript JSX namespace declarations for editors (`JSX.IntrinsicElements`).
- `tardis inspect` to print the scene tree from a running app.
- A web backend via a scene-to-DOM adapter (M8) so the same TSX runs in a
  browser.

## Docs

- Rebuild the documentation site on the TSX stack; the v1 `.tardis` site was
  removed.
- Add a migration note from `.tardis` blueprints to TSX signals (v1 is in git
  history).
- Record a short screen capture of the window and the headless screenshot flow.
