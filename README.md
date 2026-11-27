# Tardis TS

[![ci](https://github.com/devansharora18/tardis-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/devansharora18/tardis-ts/actions/workflows/ci.yml)

**TSX-native UI framework for Linux, macOS, Windows, and the web.**

Pre-alpha. One TSX entry runs in a native window (Rust renderer, embedded
QuickJS) or in a browser (DOM host). Mobile is deferred.

## Targets

| Target | Status |
|---|---|
| Linux (X11/Wayland) | Verified here: window, headless PNG, click e2e |
| macOS | CI build/test path; GUI smoke is a host check |
| Windows | CI build/test path; GUI smoke is a host check |
| Web | Verified in Chrome and jsdom; `dev`/`build`/`preview` |
| Mobile | Deferred |

## Quick start

```sh
npx @devansharora18/tardis-ts create
```

The scaffolder asks for platforms (native, web, or both), styling (Tardis style
objects or Tailwind on web), a template (counter, form, or 100k-row sheet), the
package manager, dependency install, and git initialization. Every prompt has
a non-interactive flag:

```sh
npx @devansharora18/tardis-ts create my-app \
  --platform both --styling default --template sheet --pm npm --yes
```

Then:

```sh
cd my-app
npm install
npm run dev        # native, if selected
npm run dev:web    # browser, if selected
```

No Rust is needed for the web target. `tardis-ts build --target web` writes
`dist/web/app.js` plus a generated `index.html`; `tardis-ts preview` serves it.
npm installs a prebuilt native runtime through optional platform packages; if
your platform is missing, build from source with
`cargo build --release --manifest-path node_modules/@devansharora18/tardis-ts/native/Cargo.toml`.
See [docs/PACKAGING.md](docs/PACKAGING.md).

### From this repository

```sh
npm install
npm run build
cargo build --manifest-path native/Cargo.toml
node dist/bin/tardis-ts.js dev examples/native-counter/app.tsx
node dist/bin/tardis-ts.js dev examples/native-counter/app.tsx --target web
```

## One app, two hosts

```tsx
import '@devansharora18/tardis-ts/web'
import { createSignal, render } from '@devansharora18/tardis-ts/scene'

const [count, setCount] = createSignal(0)

function App() {
  return (
    <div style={{ padding: 32, gap: 12 }}>
      <h1>Tardis</h1>
      <p>Count: {count()}</p>
      <button style={{ width: 200 }} onClick={() => setCount((n) => n + 1)}>
        Increment
      </button>
    </div>
  )
}

render(() => <App />)
```

`@devansharora18/tardis-ts/web` boots the DOM host in a browser. In QuickJS there
is no `document`, so the import is a no-op and the native host receives the
same scene patches.

## Example applications

- **Tardis Code** (`examples/editor`) — VS Code-style activity bar, explorer,
  tabs, breadcrumbs, command palette (Ctrl/Cmd+Shift+P), minimap, line/column
  status, minimap, and a working editor on native and web. Compared with Zed in
  [docs/EDITORS.md](docs/EDITORS.md).
- **Tardis Sheet** (`examples/spreadsheet`) — 100,000 × 8 virtualized grid with
  selection, formula bar, arithmetic, and SUM/AVERAGE/MIN/MAX. Compared with a
  Dioxus virtualized grid in [docs/SHEETS.md](docs/SHEETS.md).
- **14 more** — paint, markdown word processor, slides, kanban, calendar,
  contacts, calculator, weather and chat APIs, image gallery, and a web-only
  PDF editor. See `examples/` and the docs site.

## How it works

```
                         ┌─ native: QuickJS ─ taffy ─ cosmic-text ─ tiny-skia
app.tsx ─ compiler ─ bundle
                         └─ web: DOM host ─ CSS flex ─ browser text
```

- The compiler turns TSX into a retained scene tree; signals update nodes in
  place. There is no virtual DOM.
- Native: a small Rust core owns flexbox, text, and raster; the app runs in
  embedded QuickJS.
- Web: the same patch stream is applied to DOM elements; CSS flex replaces
  taffy, and the browser text engine replaces cosmic-text.
- The patch protocol is identical; only the host differs.

## Production surface

- **Virtualized lists** — `VirtualList` mounts only the visible window plus
  overscan. A 10,000-row app holds ~40 scene nodes, not 20,000.
- **Router** — `createRouter`, `Router`, `Link`, and `matchPath` work natively
  (memory history) and in the browser (`history` + `popstate`).
- **Keyboard and focus** — pointer down focuses a node; `onKeyDown`/`onKeyUp`
  bubble; Enter/Space activates the nearest clickable ancestor; `focusNode(id)`
  sets focus explicitly.
- **Wheel scrolling** — native winit and DOM wheel events reach `onWheel`.
- **Images** — native decodes PNGs with a cached raster; web uses `<img>`.
- **Clipping** — `overflow: hidden` clips children in the native renderer, so
  virtual lists and nested content do not bleed.
- **Borders** — `borderWidth`, `borderColor`, and `borderRadius` draw inset
  rounded borders; web maps them to CSS.
- **Accessible forms** — `TextField` and `Checkbox` with caret editing,
  selection, multiline, word/vertical navigation, IME composition, focus/blur,
  Tab/Shift+Tab traversal, `role`/`aria-*`, copy/cut/paste, and native
  `arboard`/web `navigator.clipboard` bridges.
- **Form state** — `createForm` (values, touched, errors, async validation,
  submitting, submit errors, reset) and `FormField` for labels/errors.
- **Inputs** — `Select` (combobox/listbox) and `RadioGroup` (roving focus) in
  addition to `TextField` and `Checkbox`.
- **Dialog** — modal overlay with `aria-modal`, a Tab focus trap, Escape close,
  and focus restoration.
- **Async data** — `createResource` (loading/error/refetch, `AbortSignal`,
  last-request-wins) and `createMutation` (mutate/loading/error/data, latest call
  wins, abort on dispose).
- **wgpu backend** — `tardis-ts run --backend wgpu` presents native frames through a
  wgpu surface (vsync, resize, HiDPI) with automatic fallback to softbuffer.
  Rasterization is still CPU; a GPU geometry pipeline is not implemented.
- **Native accessibility** — the scene maps to an AccessKit tree with roles,
  names, values, bounds, focus, and focus/click/set-value actions. Web renders
  semantic DOM elements with ARIA attributes.
- **SSR + hydration** — `renderToString`/`renderDocument` serialize the same
  scene tree without a DOM; `hydrate` takes over server markup on the client.
- **ScrollView** — wheel scrolling with a scrollbar for arbitrary content.
- **Boundary** — render errors and effect errors from the subtree show a
  fallback with reset instead of a blank screen.
- **Devtools** — `installDevtools()` from `tardis-ts/devtools` overlays the live
  scene tree and the patch stream.
- **HiDPI** — native layout stays logical; raster, text, surfaces, and input use
  the window scale factor. `tardis-ts-native --scale` covers headless images.
- **Semantic web output** — `button`, `h1`, `p`, `ul`, `li`, `label`, `strong`,
  and `em` render as real elements instead of generic divs.

## Measured performance

Release build, AMD Ryzen AI 7 350, core harness (patch + layout + paint):

| Workload | Before | Now |
|---|---:|---:|
| 1k rows, one text update | 50.1 ms | 1.97 ms |
| 10k rows fully mounted, update | 594.6 ms | 23.0 ms |
| 10k rows, virtualized window update | — | 0.55 ms |
| 10k rows, paint | 150.0 ms | 1.87 ms |

A fully mounted 10k-node scene is a stress case and still misses 60 fps on a
single update. The virtualized path is the production shape and passes with
headroom.

Same-machine startup/size baseline against Dioxus 0.6.3 desktop (first paint,
Xvfb, release): **Tardis 451 ms / 7.3 MB vs Dioxus 625 ms / 8.7 MB**.

Browser frame-time head-to-head (10k mounted rows, every row updated per frame,
Chrome): **Tardis 143.1 ms/frame (7.0 fps) vs Dioxus 93.2 ms/frame (10.7 fps)**.
Dioxus is ~1.54x faster on that stress workload; both miss 60 fps. Tardis wins
startup/size and native paint, and virtualized lists update in 0.55 ms. See
[docs/BENCHMARKS.md](docs/BENCHMARKS.md) for method and the optimization plan.

Virtualized spreadsheet scrolling with 100,000 rows is a tie: **Tardis 60.2 fps
(p95 17.5 ms) vs Dioxus 60.3 fps (p95 17.0 ms)**. The editor comparison with Zed
1.30.2: **410 ms / 45.5 MiB startup+RSS vs 624 ms / 363 MiB**. On the same
fully-mounted 10k browser update: Tardis 8.3 fps, Dioxus 12.3, React 6.0, and
React in Electron 4.1 fps. Zed wins on features; Tardis wins startup, memory,
size, and web support. See [docs/SHEETS.md](docs/SHEETS.md),
[docs/EDITORS.md](docs/EDITORS.md), and [docs/ELECTRON.md](docs/ELECTRON.md).

## Server rendering

Export the component and guard the client render:

```tsx
export function App() {
  const [name] = createSignal('Ada')
  return <h1>Hello {name()}</h1>
}

if (typeof document !== 'undefined') render(() => <App />)
```

On the server:

```ts
import { renderToString, renderDocument } from '@devansharora18/tardis-ts/ssr'
import { App } from './app'

const body = renderToString(App)
const html = renderDocument(body, { title: 'My app', script: '/app.js' })
```

On the client:

```ts
import { hydrate } from '@devansharora18/tardis-ts/ssr'
hydrate(App, document.getElementById('app')!)
```

`renderToString` restores the host global and needs no DOM. `hydrate` renders
into a staging host, compares text content, warns on mismatch, then replaces the
server nodes with the live client tree. It is not node adoption and there is no
streaming yet.

## Docs site

Build the landing page and documentation site into `site/dist`:

```sh
npm run build
node scripts/build-site.mjs
npx http-server site/dist   # any static server
```

The landing page and docs site are Tardis TS apps; the docs content is generated
from `docs/*.md` by `scripts/build-docs-content.mjs`.

## Commands

| Command | What it does |
|---|---|
| `tardis-ts init` | Create `app.tsx`, `package.json`, `tsconfig.json` |
| `tardis-ts build [entry]` | Bundle native (`dist/app.js`) or `--target web` (`dist/web/app.js` + shell) |
| `tardis-ts run [entry]` | Build and open the native window |
| `tardis-ts dev [entry]` | Native: restart on change. `--target web`: serve + reload |
| `tardis-ts screenshot [entry]` | Native headless PNG; `--dump` writes scene JSON |
| `tardis-ts preview` | Serve a built web app |

Options: `--target native|web`, `--out`, `--minify`, `--width`, `--height`,
`--port`, `--dump`.

Entry resolution: `app.tsx`, `src/app.tsx`, `index.tsx`, `src/index.tsx`.

## Limits (v0)

- Native props are reactive getters: use `props.title()`.
- Styles are objects, not CSS. Web maps them to CSS; native maps them to taffy.
- Web layout is DOM/CSS, native is taffy; font metrics and line breaks can differ.
- Dynamic arrays rebuild; keyed reuse is not implemented.
- Text input has selection, multiline, and IME commit/preview; pointer caret
  placement is not implemented.
- Clipboard is system-backed on web and native when a display is available.
- Native text clipping clips rectangles; `textOverflow: 'ellipsis'` truncates
  the first line and appends an ellipsis.
- Native accessibility trees use AccessKit; screen-reader behavior still needs
  host testing on macOS/Windows/Linux.
- Native HiDPI is handled with the window scale factor; verify on Retina hosts.
- Hydration adopts server DOM nodes in place (matching by structure, then
  updating styles/text/ARIA); the content comparison still warns on mismatch.
- No streaming SSR or data prefetch; no server bundle CLI yet.
- Boundary catches render and subtree effect errors; native core panics still
  keep the last frame.
- ScrollView needs an explicit content height; its scrollbar is draggable.
- Ellipsis is opt-in with `textOverflow: 'ellipsis'` (single line).
- The wgpu backend presents CPU-rasterized frames; it does not yet rasterize
  geometry/text on the GPU.
- Mobile is not started.
- Browser full-list updates are slower than Dioxus (see benchmarks);
  virtualized lists are the supported large-list shape.
- The editor has a basic per-line syntax highlighter, but no LSP, find/replace,
  multi-cursor, undo, Git, or terminal yet.
- The spreadsheet edits through the formula bar; there is no horizontal scroll,
  clipboard range, CSV import/export, or direct cell typing.
- Tailwind classes apply on web only; native uses the inline style objects.
- Scaffolding defaults install dependencies; the alpha package is not published
  yet, so pass `--yes` or answer "no" to install locally.

## Docs

- [TSX guide](docs/TSX.md)
- [Architecture](docs/native/architecture.md)
- [Frame protocol](docs/native/protocol.md)
- [Decisions](docs/DECISIONS.md)
- [TODO](docs/TODO.md)
- [Benchmarks](docs/BENCHMARKS.md)
- [Editor vs Zed](docs/EDITORS.md)
- [100k spreadsheet comparison](docs/SHEETS.md)
- [Packaging and signing](docs/PACKAGING.md)
- [Electron/React comparison](docs/ELECTRON.md)
- [Docs site source](site/docs/app.tsx) and [landing source](site/landing/app.tsx)
- [ADR 0003 — TSX-only v2](docs/adr/0003-tsx-only-v2.md)
- [ADR 0004 — web DOM adapter](docs/adr/0004-web-dom-adapter.md)
- [ADR 0005 — engine and performance strategy](docs/adr/0005-runtime-engine-and-performance.md)
