# TardisJS

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

### Web

```sh
npx @devansharora18/tardisjs init
npm install
npx tardis dev --target web
```

No Rust needed for the web target. `tardis build --target web` writes
`dist/web/app.js` plus a generated `index.html`; `tardis preview` serves it.

### Native

npm installs a prebuilt runtime for Linux, macOS, and Windows through optional
platform packages. If your platform is missing, build from source:

```sh
cargo build --release --manifest-path node_modules/@devansharora18/tardisjs/native/Cargo.toml
npx tardis dev
```

See [docs/PACKAGING.md](docs/PACKAGING.md) for the release/signing process.

### From this repository

```sh
npm install
npm run build
cargo build --manifest-path native/Cargo.toml
node dist/bin/tardis.js dev examples/native-counter/app.tsx
node dist/bin/tardis.js dev examples/native-counter/app.tsx --target web
```

## One app, two hosts

```tsx
import '@devansharora18/tardisjs/web'
import { createSignal, render } from '@devansharora18/tardisjs/scene'

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

`@devansharora18/tardisjs/web` boots the DOM host in a browser. In QuickJS there
is no `document`, so the import is a no-op and the native host receives the
same scene patches.

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
- **Accessible forms** — `TextField` and `Checkbox` with caret editing,
  selection, multiline, word/vertical navigation, IME composition, focus/blur,
  Tab/Shift+Tab traversal, `role`/`aria-*`, copy/cut/paste, and native
  `arboard`/web `navigator.clipboard` bridges.
- **Form state** — `createForm` (values, touched, errors, async validation,
  submitting, submit errors, reset) and `FormField` for labels/errors.
- **Inputs** — `Select` (combobox/listbox) and `RadioGroup` (roving focus) in
  addition to `TextField` and `Checkbox`.
- **Async resources** — `createResource` with loading, error, refetch,
  `AbortSignal` cancellation, and last-request-wins semantics.
- **Native accessibility** — the scene maps to an AccessKit tree with roles,
  names, values, bounds, focus, and focus/click/set-value actions. Web renders
  semantic DOM elements with ARIA attributes.
- **SSR + hydration** — `renderToString`/`renderDocument` serialize the same
  scene tree without a DOM; `hydrate` takes over server markup on the client.
- **ScrollView** — wheel scrolling with a scrollbar for arbitrary content.
- **Boundary** — render errors and effect errors from the subtree show a
  fallback with reset instead of a blank screen.
- **Devtools** — `installDevtools()` from `tardisjs/devtools` overlays the live
  scene tree and the patch stream.
- **HiDPI** — native layout stays logical; raster, text, surfaces, and input use
  the window scale factor. `tardis-native --scale` covers headless images.
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
import { renderToString, renderDocument } from '@devansharora18/tardisjs/ssr'
import { App } from './app'

const body = renderToString(App)
const html = renderDocument(body, { title: 'My app', script: '/app.js' })
```

On the client:

```ts
import { hydrate } from '@devansharora18/tardisjs/ssr'
hydrate(App, document.getElementById('app')!)
```

`renderToString` restores the host global and needs no DOM. `hydrate` renders
into a staging host, compares text content, warns on mismatch, then replaces the
server nodes with the live client tree. It is not node adoption and there is no
streaming yet.

## Commands

| Command | What it does |
|---|---|
| `tardis init` | Create `app.tsx`, `package.json`, `tsconfig.json` |
| `tardis build [entry]` | Bundle native (`dist/app.js`) or `--target web` (`dist/web/app.js` + shell) |
| `tardis run [entry]` | Build and open the native window |
| `tardis dev [entry]` | Native: restart on change. `--target web`: serve + reload |
| `tardis screenshot [entry]` | Native headless PNG; `--dump` writes scene JSON |
| `tardis preview` | Serve a built web app |

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
- Mobile is not started.
- Browser full-list updates are slower than Dioxus (see benchmarks);
  virtualized lists are the supported large-list shape.

## Docs

- [TSX guide](docs/TSX.md)
- [Architecture](docs/native/architecture.md)
- [Frame protocol](docs/native/protocol.md)
- [Decisions](docs/DECISIONS.md)
- [TODO](docs/TODO.md)
- [Benchmarks](docs/BENCHMARKS.md)
- [ADR 0003 — TSX-only v2](docs/adr/0003-tsx-only-v2.md)
- [ADR 0004 — web DOM adapter](docs/adr/0004-web-dom-adapter.md)
- [ADR 0005 — engine and performance strategy](docs/adr/0005-runtime-engine-and-performance.md)
