# Examples

Sixteen apps live in `examples/<name>/app.tsx`. They share
`examples/shared/office.tsx`: an original light Fluent-class shell with title
bar, ribbon or toolbar, status bar, drawn icons, and a per-app accent. The
editor intentionally keeps a dark VS Code-like shell. No vendor icons or
artwork are copied.

| Example | What it demonstrates |
|---|---|
| `native-counter` | signals, commands, starter card |
| `forms` | createForm, validation, async submit, plan cards |
| `virtual-10k` | 10k-row virtual directory, search, inspector |
| `editor` | dark code editor, tabs, palette, minimap |
| `spreadsheet` | ribbon, 100k × 10, formats, ranges, sort, sheets, CSV |
| `word` | page canvas, ruler, tables, markdown source, margins |
| `slides` | themes, thumbnails, notes, presenter |
| `paint` | brush/eraser, undo/redo, PNG export |
| `pdf-editor` | web-only PDF.js preview and pdf-lib export |
| `calendar` | month/agenda, filters, event inspector |
| `contacts` | People list, card, editor, CSV |
| `kanban` | columns, priorities, card inspector |
| `chat` | conversation UI, suggestions, OpenAI-compatible endpoint |
| `calculator` | parser, memory, history, keyboard |
| `weather` | live Open-Meteo, saved places, units |
| `image-viewer` | filmstrip, zoom, fit/fill, metadata |

Build either target:

```sh
node dist/bin/tardis-ts.js build examples/<name>/app.tsx --out /tmp/app.js
node dist/bin/tardis-ts.js build examples/<name>/app.tsx --target web --out /tmp/web/app.js
node dist/bin/tardis-ts.js screenshot examples/<name>/app.tsx -o shot.png
```

`test/examples/build.test.ts` builds all examples for web;
`test/examples/apps-web.test.ts` mounts the shells and checks key interactions.
