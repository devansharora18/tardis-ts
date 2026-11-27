# Examples catalog

Sixteen apps live in `examples/`. Fifteen run on native and web; the PDF editor
is web-only because it depends on PDF.js canvas rendering and Blob downloads.

| App | Path | Highlights |
|---|---|---|
| Counter | `examples/native-counter` | signals, button, minimal app |
| Forms | `examples/forms` | createForm, FormField, validation |
| Virtual 10k | `examples/virtual-10k` | VirtualList |
| Tardis Code | `examples/editor` | VS Code-style tabs, command palette, minimap, syntax colors |
| Tardis Sheet | `examples/spreadsheet` | Excel-style ribbon, 100k cells, formats, sorting, sheets, save/export |
| Tardis Paint | `examples/paint` | PNG encoder, data URLs, pointer strokes |
| Tardis Docs | `examples/word` | Word-style page canvas, navigation, tables, source pane, margins |
| Tardis Slides | `examples/slides` | slide editor + presentation mode |
| Tardis Board | `examples/kanban` | columns, cards, inspector, persistence |
| Tardis Calendar | `examples/calendar` | month grid, events, persistence |
| Tardis Contacts | `examples/contacts` | CRUD, search, CSV export |
| Tardis Calculator | `examples/calculator` | expression parser, keypad |
| Tardis Weather | `examples/weather` | Open-Meteo API |
| Tardis Chat | `examples/chat` | OpenAI-compatible endpoint |
| Tardis Images | `examples/image-viewer` | generated PNG gallery |
| Tardis PDF | `examples/pdf-editor` | PDF.js preview, pdf-lib page operations |

Build any example:

```sh
node dist/bin/tardis-ts.js build examples/editor/app.tsx --out /tmp/editor.js
node dist/bin/tardis-ts.js build examples/editor/app.tsx --target web --out /tmp/editor-web/app.js
node dist/bin/tardis-ts.js screenshot examples/spreadsheet/app.tsx -o sheet.png
```

`tests/examples/build.test.ts` builds every example for web. Formula, paint PNG,
calculator, weather, and chat API tests live in `test/examples/`.

Native file dialogs are not implemented, so file import/export in Word, Paint,
Images, and PDF is web-oriented; native persistence uses `localStorage`.
