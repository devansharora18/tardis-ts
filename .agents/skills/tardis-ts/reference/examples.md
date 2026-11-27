# Examples

All examples live in `examples/<name>/app.tsx`. Build both targets with:

```sh
node dist/bin/tardis-ts.js build examples/<name>/app.tsx --out /tmp/app.js
node dist/bin/tardis-ts.js build examples/<name>/app.tsx --target web --out /tmp/web/app.js
```

| Example | What it demonstrates |
|---|---|
| `native-counter` | signals, button, minimal app |
| `forms` | createForm, FormField, TextField, Checkbox |
| `virtual-10k` | VirtualList |
| `editor` | tabs, gutter, command palette, syntax colors, minimap |
| `spreadsheet` | 100k cells, formula engine, formula bar |
| `paint` | PNG encoder, data URLs, local pointer coordinates |
| `word` | markdown parser, preview, localStorage |
| `slides` | presentation mode, keyboard navigation |
| `kanban` | board state, card inspector, persistence |
| `calendar` | date grid, events, persistence |
| `contacts` | CRUD, search, CSV export |
| `calculator` | expression parser and keypad |
| `weather` | Open-Meteo API, native fetch and web fetch |
| `chat` | OpenAI-compatible endpoint, non-streaming |
| `image-viewer` | generated PNG gallery, data-URL decoding |
| `pdf-editor` | web-only: PDF.js preview + pdf-lib export |

`bench/web-frame/run.mjs` measures Tardis, Dioxus, and React. `bench/sheet-frame`
measures the 100k sheet against Dioxus. `bench/electron/run.mjs` measures the
React workload in Electron.
