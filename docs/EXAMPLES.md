# Examples catalog

Sixteen apps live in `examples/`. Fifteen run on native and web; the PDF editor
is web-only because it depends on PDF.js canvas rendering and Blob downloads.

| App | Path | Highlights |
|---|---|---|
| Tardis Counter | `examples/native-counter` | signals, commands, starter card |
| Tardis Forms | `examples/forms` | createForm, validation, plans, async submit |
| Tardis Directory | `examples/virtual-10k` | 10k-row virtual table, search, inspector |
| Tardis Code | `examples/editor` | VS Code-like tabs, palette, minimap, syntax colors |
| Tardis Sheet | `examples/spreadsheet` | ribbon, 100k × 10, formats, sort, sheets, CSV |
| Tardis Word | `examples/word` | page canvas, ruler, tables, source pane, margins |
| Tardis Slides | `examples/slides` | themes, thumbnails, speaker notes, presenter |
| Tardis Paint | `examples/paint` | brush/eraser, undo/redo, PNG export |
| Tardis PDF | `examples/pdf-editor` | page thumbnails, reorder, rotate, annotate, export |
| Tardis Calendar | `examples/calendar` | month/agenda, filters, events, persistence |
| Tardis Contacts | `examples/contacts` | People list, card, editor, CSV export |
| Tardis Board | `examples/kanban` | columns, priorities, inspector, persistence |
| Tardis Chat | `examples/chat` | sidebar, bubbles, suggestions, OpenAI-compatible endpoint |
| Tardis Calculator | `examples/calculator` | expression parser, memory, history, keyboard |
| Tardis Weather | `examples/weather` | live Open-Meteo, 7-day forecast, saved places |
| Tardis Photos | `examples/image-viewer` | filmstrip, zoom, fit/fill, metadata |

Build any example:

```sh
node dist/bin/tardis-ts.js build examples/editor/app.tsx --out /tmp/editor.js
node dist/bin/tardis-ts.js build examples/editor/app.tsx --target web --out /tmp/editor-web/app.js
node dist/bin/tardis-ts.js screenshot examples/spreadsheet/app.tsx -o sheet.png
```

The non-editor apps share `examples/shared/office.tsx`, an original
Fluent-class shell with no vendor artwork. `test/examples/build.test.ts` builds
every example for web; formula, paint PNG, calculator, weather, chat, markdown,
and app-mount tests live in `test/examples/`. `test/web/dom.test.ts` guards the
base border and text-field behavior.

Native file dialogs are not implemented, so file import/export in Word, Paint,
Images, and PDF is web-oriented; native persistence uses `localStorage`.
