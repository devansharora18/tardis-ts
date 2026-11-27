# Handoff — Tardis TS example UX pass

## State

- Repo: `/home/devansharora18/Documents/GitHub/tardisjs` (GitHub
  `devansharora18/tardis-ts`), branch `main`.
- Latest commit: `4f19a82 chore: add claude instructions and skills`.
- Working tree: clean except harness-managed `AGENTS.md` / `.agents/`; do not
  commit those.
- `CLAUDE.md` mirrors `AGENTS.md`; `.claude/skills/` has all 45 skills.
- CI: green on Ubuntu, macOS, Windows at `4f19a82`.
- Baseline: **204 JS tests**, `tsc`, `typecheck:apps`, Rollup build, site build,
  `cargo fmt`, clippy (default + wgpu), 25 Rust tests.
- 16 examples now run on native and web (PDF is web-only); 15 share an original
  light office shell, the editor keeps its dark VS Code-like shell.

The job now is UX polish: find and fix real interaction and layout bugs, run
both hosts, take screenshots, and keep the test suite green.

## What exists

TSX-only framework. Components run once; signals bind to a retained scene tree.
Two hosts consume the same patch stream:

- Native: Rust core (taffy/cosmic-text/tiny-skia) inside winit, app code in
  embedded QuickJS. `native/crates/{core,js,cli}`.
- Web: DOM host (`src/web/`), CSS flex, semantic elements.

Examples:

| App | Entry | Notes |
|---|---|---|
| Tardis Counter | `examples/native-counter/app.tsx` | starter, signals |
| Tardis Forms | `examples/forms/app.tsx` | createForm, plans, async submit |
| Tardis Directory | `examples/virtual-10k/app.tsx` | 10k rows, search, inspector |
| Tardis Code | `examples/editor/app.tsx` | dark code editor, palette |
| Tardis Sheet | `examples/spreadsheet/app.tsx` | ribbon, 100k × 10, formulas |
| Tardis Word | `examples/word/app.tsx` | page canvas, ruler, tables |
| Tardis Slides | `examples/slides/app.tsx` | themes, thumbnails, presenter |
| Tardis Paint | `examples/paint/app.tsx` | brush, undo/redo, PNG |
| Tardis PDF | `examples/pdf-editor/app.tsx` | web-only PDF.js + pdf-lib |
| Tardis Calendar | `examples/calendar/app.tsx` | month/agenda, filters |
| Tardis Contacts | `examples/contacts/app.tsx` | People list, editor, CSV |
| Tardis Board | `examples/kanban/app.tsx` | columns, inspector, persistence |
| Tardis Chat | `examples/chat/app.tsx` | OpenAI-compatible endpoint |
| Tardis Calculator | `examples/calculator/app.tsx` | parser, memory, history |
| Tardis Weather | `examples/weather/app.tsx` | live Open-Meteo |
| Tardis Photos | `examples/image-viewer/app.tsx` | filmstrip, zoom, metadata |

Shared UI: `examples/shared/office.tsx` — `OfficeApp`, `DesktopApp`, `Toolbar`,
`Ribbon`, `RibbonGroup`, `BigCommand`, `SmallCommand`, `ToolbarButton`,
`TitleBar`, `TabStrip`, `StatusBar`, `Icon`, `office`, `accents`.
App names are Tardis*; no vendor artwork or trademarks are used.

## Setup and verified commands

```sh
npm ci
npm run build                 # library + CLI
npm test                      # 204 passing
npx tsc --noEmit
npm run typecheck:apps
node scripts/build-site.mjs   # site/dist
```

Native checks:

```sh
cd native
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo clippy --workspace --all-targets --features wgpu -- -D warnings
cargo test --workspace
```

Verified next command (run in this session, exit 0):

```sh
npm run build
node dist/bin/tardis-ts.js screenshot examples/calendar/app.tsx \
  --width 1280 --height 800 -o /tmp/handoff-calendar.png
# wrote /tmp/handoff-calendar.png (179K)
```

## Screenshot recipes

### Native headless (fastest, no display)

```sh
npm run build
node dist/bin/tardis-ts.js screenshot examples/spreadsheet/app.tsx \
  --width 1280 --height 800 -o /tmp/sheet.png --dump /tmp/sheet.json
```

`--dump` writes laid-out node rects; use it for clipping/alignment bugs.

### Native real window (X11 under Xvfb)

```sh
node dist/bin/tardis-ts.js build examples/paint/app.tsx --out /tmp/paint/app.js
Xvfb :90 -screen 0 1280x800x24 &
env -u WAYLAND_DISPLAY DISPLAY=:90 WINIT_UNIX_BACKEND=x11 \
  ./native/target/release/tardis-ts-native \
  --bundle /tmp/paint/app.js --width 1280 --height 800 &
sleep 3
DISPLAY=:90 import -window root /tmp/paint-window.png
```

**Trap:** without `env -u WAYLAND_DISPLAY … WINIT_UNIX_BACKEND=x11` the window
can be invisible/black even though the process runs. This cost time earlier.
To kill, `kill %1` and `kill %2`.

### Web build + browser screenshots

```sh
mkdir -p /tmp/tardis-web
for dir in examples/*/; do
  name=$(basename "$dir")
  [ -f "$dir/app.tsx" ] || continue
  mkdir -p "/tmp/tardis-web/$name"
  node dist/bin/tardis-ts.js build "$dir/app.tsx" --target web \
    --out "/tmp/tardis-web/$name/app.js"
done
python3 -m http.server 4352 --directory /tmp/tardis-web
```

Playwright installed in this environment lives at
`$(npm root -g)/omniroute/node_modules/playwright/index.mjs`
(Chrome at `/usr/bin/google-chrome`). Minimal script:

```js
import { execSync } from 'node:child_process'
import path from 'node:path'
const g = execSync('npm root -g', { encoding: 'utf8' }).trim()
const { chromium } = await import(
  path.join(g, 'omniroute/node_modules/playwright/index.mjs')
)
const b = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
})
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text())
})
await p.goto('http://127.0.0.1:4352/calendar/', { waitUntil: 'load' })
await p.waitForTimeout(700)
await p.screenshot({ path: '/tmp/calendar.png' })
console.log('errors', errors)
await b.close()
```

If Playwright is unavailable, `npm i -D playwright` is acceptable, or use
Chrome headless for a single screenshot, but the module above is the proven path.

### Driving the apps

- `TextField` renders a **`div[role=textbox]`**, not `<input>`. Use
  `locator.click()` then `page.keyboard.type(...)`; **`.fill()` does not work**.
- Buttons are `div[role=button]` with `aria-label` or text. Icon-only
  `SmallCommand` falls back to the icon name.
- Weather auto-fetches San Francisco on load and needs ~6 s.
- PDF needs a file chooser: click `Open`, `setFiles('/tmp/sample.pdf')`.
- Native screenshots use the same app code; use 1280×800 for parity.

Last verified matrices:

- Web: `/tmp/all-web/<name>/screenshot.png`; montage `/tmp/all-web-montage3.jpg`.
- Native: `/tmp/all-native/<name>/screenshot.png`; montage
  `/tmp/all-native-montage3.jpg`.
- 14 interactive Playwright flows passed for slides, paint, calculator,
  calendar, contacts, kanban, chat, forms, directory, weather, PDF, photos,
  counter, spreadsheet. Word source typing and editor tests also pass.

## Known UX bugs / polish backlog

Priority is judgment; confirm with a screenshot before and after.

### P1 — clearly wrong or crashy

1. **Contacts can delete every contact and leave stale UI.**
   Repro: `/contacts/`, click “Delete contact” four times. List becomes
   “0 contacts”, but the card/editor can still show the last contact; a later
   rerender can dereference `undefined`. `active()` in
   `examples/contacts/app.tsx` returns `contacts()[0]!` with no empty guard.
   Fix: keep at least one record, or render an explicit empty state and guard
   `ContactCard`/`Editor`; update `activeId` after deletion.
2. **Calculator keyboard double-handles Enter.**
   Repro: click key `7`, then type `+2`, press Enter. Display/history becomes
   `7+27 = 34`, not `7+2 = 9`. The focused key button receives Enter activation
   and the root `onKeyDown` also evaluates. Fix focus/activation so Enter only
   evaluates, without making the keypad inaccessible.
3. **Slides presentation keyboard does nothing.**
   Repro: `/slides/`, click Present, press ArrowRight. Slide stays `1 / 5`;
   active element is BODY. The presentation root has `tabIndex` but is not
   focused. Fix by focusing the presentation surface when it mounts, or add an
   auto-focus mechanism. Visible Next/Exit buttons work.
4. **Calendar “Upcoming” rows look like error boxes.**
   `examples/calendar/app.tsx` `CalendarPane` applies `borderWidth: 2` with the
   tag color to the entire row. Use a left accent bar (small colored div) and a
   neutral border, like the month chips.
5. **PDF active page uses the danger-red accent as a selection border.**
   `PageList` uses `ACCENT.main` (`accents.access` red) for the active page
   outline; it reads as an error. Use a blue selection border/tint; keep red for
   the app brand only.
6. **Word page content below the fold has no visible scrollbar.**
   `ScrollView showScrollbar: false`; the page is 760 px tall in a ~580 px
   viewport, so the bottom/page number is unreachable-looking. Add a thin themed
   scrollbar or a custom indicator; the wheel works.
7. **Paint release outside the canvas leaves a stroke active.**
   `onPointerUp` is on the image. Drag off the canvas, release, move back: it
   keeps drawing. Attach `onPointerUp` to an ancestor/root so release always ends
   the stroke. Same class of bug for spreadsheet range dragging.
8. **Spreadsheet direct cell typing is missing.**
   Clicking a cell only selects it; typing goes nowhere unless the formula bar is
   focused. Add an in-cell editor overlay for the active cell (double-click or
   type-to-edit) while keeping formula-bar editing.
9. **Kanban “Board” / “My cards” controls are dead or misleading.**
   “Board” has no handler; “My cards” only sets “All cards are visible”. Remove
   them, disable with an explanation, or implement real views/filters.
10. **Responsive widths are fixed.**
    Virtual directory columns total 1018 px + 260 inspector; Word page 620 +
    210 nav + 344 source; Forms 620 + 252 summary; Chat composer 620; PDF
    panes. At 800×600 / narrow windows columns and panels clip. Add horizontal
    scroll for tables and collapsible/resizable panes, or set minimum window
    widths and document them. Native e2e runs at 800×600.

### P2 — real but not catastrophic

11. **Spreadsheet long notes clip.**
    `A13` note is cut at the cell edge (`examples/spreadsheet/app.tsx` `Cell`
    uses `overflow: hidden`). Excel overflows into empty neighbors. Either
    implement overflow, merge a note range, or move notes to a dedicated panel.
12. **Spreadsheet formulas after sorting.**
    `sortRange` moves rows but does not adjust relative references inside
    formulas; verify and fix or clearly label sort as values-only.
13. **Word formatting is source-pane-only.**
    B/I/U/style buttons call `ensureSource()` and may require a second click
    after opening. Make the first click insert at the current caret, or open the
    source and focus the editor in one action.
14. **Chat loses composer focus after each send/demo reply.**
    `Conversation` is inside `dynamic(...)`; messages change on send, remounting
    the composer. Keep the composer outside the messages dynamic, or restore
    focus.
15. **Chat auto-scroll is approximate.**
    `contentHeight` is estimated from character count; long messages can be cut
    or over-scrolled. Measure or use a fixed list with reliable scroll-to-end.
16. **Forms error summary does not take you to the bad field.**
    After submit with errors, focus/scroll to the first error. Terms error only
    appears after touch; on submit it works, but the user has to hunt.
17. **Calendar event time is not validated.**
    Any string in `Event time` is accepted. Validate `HH:MM`; handle all-day
    events; show a clear error.
18. **Calendar month cells can clip events.**
    Two events max with a “+N” label; no click-through, and long titles wrap or
    clip. Add an overflow popover.
19. **Slides editing is inspector-only.**
    Title/body cannot be edited on the canvas; no drag/reorder of thumbnails.
    Add direct editing or make the inspector obviously primary.
20. **PDF rotation only changes the badge.**
    Preview does not rotate; export applies rotation. Rotate the preview image
    (or clearly label “applied on export”). Annotation applies only to the
    selected page; state that in the UI.
21. **Paint is brush/eraser only.**
    No line/shape, fill, selection, or canvas resize. Decide whether this is a
    sketch demo or add tools. The canvas is fixed 760×500.
22. **Image viewer open is web-only.**
    Native shows a status only. Either add a native file dialog later or make the
    native empty state explicit. Filmstrip/zoom work.
23. **Weather auto-fetch has no retry/cancel.**
    On offline/error the error banner stays; add Retry and preserve the last
    forecast. Fixed panels clip at narrow widths.
24. **Counter is intentionally minimal.**
    Fine as a starter, but check its card at 800×600.

### P3 — visual polish

25. Native and web fonts differ: native bundles Liberation Sans/Serif + JetBrains
    Mono; web uses system sans/serif. Check line breaks and table row heights.
26. Small command icons are Unicode glyphs (⌕, ⚙, ▶, ◐, ◉, ◢). They render
    differently across hosts; replace awkward ones with drawn primitives where
    they look cheap.
27. Native clipped text: the painter now adds a 1 px layout epsilon; keep it.
28. Headers/status bars are all 10–12 px; check contrast and hit targets,
    especially icon-only buttons and checkboxes.
29. `docs/` and `site/` must stay in sync: site docs are generated from
    `docs/*.md` by `scripts/build-docs-content.mjs`; landing metrics are manual.

## Framework rules that prevent regressions

- Components run **once**. Reactive text/styles use function values or
  `dynamic(...)`; top-level `if` on a signal will not rerender.
- A `dynamic` factory tracks signals read during its run. Do **not** make an
  outer dynamic around a form/editor if it reads the field value in the same
  factory; the field remounts on every keystroke and loses focus.
- `TextField` reads its initial value with `untrack`; its own render still
  tracks updates. Pass reactive theme colors as getters, e.g.
  `borderColor: () => error() ? danger : border`.
- Pointer down resolves `onPointerDown` **before** moving focus, so a
  focus-triggered rebuild cannot swallow the press. Keep that ordering.
- Web borders: `:where([data-tardis-ts])` sets `border-width:0`,
  `border-style:solid`, transparent color. Setting `borderWidth` (inline) is
  enough; CSS-class borders still win because `:where` has zero specificity.
- Images inside pointer canvases need `draggable: false`; otherwise native HTML
  image drag fires `pointercancel` and no `pointerup`.
- Native style support is a subset: flex, padding/margin, absolute positioning,
  borders/radius, background, `display:none`, font/line height/text align,
  `whiteSpace` only normal/nowrap. No gradients, shadows, transforms, z-index,
  pointer-events, percentage widths, or horizontal ScrollView.
- `ScrollView` needs explicit `height` and `contentHeight`; its scrollbar is
  currently hidden in Word and unstyled elsewhere.
- `VirtualList` has a fixed row height and no horizontal scroll.
- Native window commands need the X11 env above; headless `screenshot` does not.
- PDF.js and Blob downloads are web-only; native shows an empty state.
- Keep benchmark workloads fixed; do not change a workload after a loss.

## Suggested order

1. Reproduce and fix the P1 crashy/obvious bugs (contacts empty, calculator
   Enter, slides keyboard, calendar borders, PDF selection, roots for pointer
   release).
2. Fix scroll/focus: Word scrollbar, chat composer focus, forms error focus.
3. Responsive pass: spreadsheet horizontal scroll, directory columns, Word/PDF
   panes, chat composer, forms on 800×600.
4. Remaining P2: direct spreadsheet editing, notes overflow, sort formulas,
   calendar validation/overflow, PDF rotation preview.
5. Visual polish + native/web parity screenshots.
6. Update `docs/TODO.md`, `docs/EXAMPLES.md`, and this handoff; one commit per
   fix; rerun the full matrix and CI.

## Definition of done

- Every fix has a before/after screenshot at 1280×800 on web and native where it
  applies, plus an 800×600 check for layout.
- No console/page errors.
- `npm test` (204+), `npx tsc --noEmit`, `npm run typecheck:apps`, `npm run
  build`, `node scripts/build-site.mjs`, and the Rust checks pass.
- New regression test for each fixed bug where practical.
- Working tree clean except harness `.agents`/`AGENTS.md`; commits one-line,
  pushed; CI green.
