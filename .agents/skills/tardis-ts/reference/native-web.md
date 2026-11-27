# Native and web hosts

| Area | Native | Web |
|---|---|---|
| Render | taffy + cosmic-text + tiny-skia | DOM/CSS |
| Language | QuickJS | browser JS |
| Window | winit + softbuffer/wgpu | `<div id="app">` |
| Storage | JSON file via `localStorage` shim | browser `localStorage` |
| HTTP | `fetch` shim over ureq | browser `fetch` |
| Clipboard | arboard | navigator + memory |
| A11y | AccessKit | semantic HTML + ARIA |
| Assets | paths or PNG data URLs | URLs/data URLs |

## Native commands

```sh
tardis-ts dev
tardis-ts run --backend wgpu --scale 2
tardis-ts screenshot -o shot.png --dump scene.json
```

`tardis-ts-native --bundle app.js --backend wgpu` uses wgpu presentation with
softbuffer fallback. Rasterization is CPU.

## Storage

Native exposes `localStorage.getItem/setItem/removeItem` backed by
`$XDG_DATA_HOME/tardis-ts/<app>/storage.json` (or platform equivalents).
`TARDIS_TS_STORAGE_DIR` overrides the directory.

## Files

No native file picker or arbitrary filesystem access is exposed. File-based apps
(PDF.js, downloads) are web-only. Keep shared apps usable with generated/demo
data natively.

## Native accessibility

The AccessKit tree maps scene roles/names/values/bounds/focus and supports focus,
default action, set-value, and replace-selected-text. Verify with Orca/Narrator/
VoiceOver on real hardware.
