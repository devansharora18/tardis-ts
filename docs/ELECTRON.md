# Electron / React comparison

All numbers are same-machine under Xvfb with software rendering. The React web
and Electron apps render the same React 18.3.1 workload: 10,000 fully mounted
rows updated on every frame for 120 frames. Tardis and Dioxus use the same text
shape from `bench/web-frame`.

## Browser frame time (Chrome, 1000×800)

| App | Mean | p50 | p95 | Dropped | FPS |
|---|---:|---:|---:|---:|---:|
| Tardis TS | 120.6 ms | 118.0 ms | 143.5 ms | 119/120 | **8.3** |
| Dioxus 0.6.3 | 81.3 ms | 78.3 ms | 96.0 ms | 119/120 | **12.3** |
| React 18.3.1 | 167.3 ms | 164.9 ms | 192.2 ms | 119/120 | **6.0** |
| React in Electron 33 | 244.4 ms | 240.8 ms | 279.4 ms | 119/120 | **4.1** |

Tardis beats React and Electron on this fully mounted stress case and loses to
Dioxus. The production shape is virtualization; see the 100k sheet tie in
[SHEETS.md](SHEETS.md).

## Startup / memory / size

| Runtime | Startup (median of 3) | RSS after 8 s | Runtime size |
|---|---:|---:|---:|
| Tardis TS native counter | **451 ms** | 45 MiB (editor) | **7.3 MB** |
| Dioxus desktop counter | 625 ms | — | 8.7 MB |
| Electron 33 + React 18 | 605 ms | **1.7 GB** (10k React list) | **263 MB** dist |
| Zed 1.30.2 | 624 ms | 363 MiB | 229 MB |

Electron startup samples: 885 / 605 / 592 ms. RSS samples for the React-in-
Electron workload: 1,193,308 / 1,159,988 / 1,192,592 KiB in the first pass and
1,740,112 KiB in the CDP run; report the higher steady number as 1.7 GB. The
Electron dist is `node_modules/electron/dist`; its executable alone is 186 MB.

## Caveats

- Electron was run with `--no-sandbox`, hardware acceleration disabled, under
  Xvfb. This is the worst-case software path and is consistent with the other
  software-rendered results.
- The React app rebuilds 10,000 text nodes every frame; that is the workload.
- RSS is the sum of the Electron process tree, not one process.
- Electron and React are general-purpose runtimes; Tardis is a smaller focused
  renderer. Size and memory are not feature parity claims.

Reproduce:

```sh
Xvfb :47 -screen 0 1024x768x24 &
DISPLAY=:47 env -u WAYLAND_DISPLAY node bench/electron/run.mjs
node bench/web-frame/run.mjs
```

Raw values: `bench/electron/results.json`, `bench/web-frame/results.json`.
