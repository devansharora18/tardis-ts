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

Build the runtime once (the npm tarball ships the Rust sources):

```sh
cargo build --release --manifest-path node_modules/@devansharora18/tardisjs/native/Cargo.toml
npx tardis dev
```

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
- No keyboard, focus, IME, clipboard, scrolling, images, or text clipping yet.
- Native HiDPI is not handled (1x).
- No web SSR/hydration yet.
- Mobile is not started.

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
