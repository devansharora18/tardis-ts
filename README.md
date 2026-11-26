# TardisJS

**TSX-native desktop UI framework. TypeScript surface, Rust renderer.**

Pre-alpha. The `.tardis` blueprint DSL is gone; v2 is TSX only.

## What it is

- Write TSX with signals. No virtual DOM, no hooks rules, no re-render pass.
- The compiler turns JSX into a retained scene tree; a small Rust core owns
  flexbox layout, text shaping, and rasterization.
- The app runs in an embedded QuickJS engine inside one native binary.
- `tardis screenshot` renders headlessly to PNG for CI and visual checks.
- The current renderer is CPU-based (tiny-skia). A wgpu backend is next.

## Status

Alpha, desktop-first. Linux/X11 verified end to end, including the window and
headless click tests. macOS/Windows have not been packaged. There is no web
target.

The npm tarball does not ship the native binary yet. Build it from this repo
(`cargo build --manifest-path native/Cargo.toml`) or point `TARDIS_NATIVE_BIN`
at a binary. See [docs/TODO.md](docs/TODO.md).

## Requirements

- Node 20+
- Rust 1.87+ (edition 2021, QuickJS bundled)
- Linux window builds need X11 or Wayland development libraries

## Quick start

From this repository:

```sh
npm install
npm run build
cargo build --manifest-path native/Cargo.toml
node dist/bin/tardis.js dev examples/native-counter/app.tsx
```

From an empty app directory:

```sh
npx @devansharora18/tardisjs init
npm install
npx tardis dev
```

## A complete app

```tsx
import { createSignal, render } from '@devansharora18/tardisjs/scene'

const [count, setCount] = createSignal(0)

function App() {
  return (
    <div style={{ padding: 32, gap: 12 }}>
      <h1>Tardis Native</h1>
      <p>Count: {count()}</p>
      <button style={{ width: 200 }} onClick={() => setCount((n) => n + 1)}>
        Increment
      </button>
    </div>
  )
}

render(() => <App />)
```

## How it works

```
app.tsx ── compiler ──▶ dist/app.js ── QuickJS ──▶ scene patches
                                                       │
                                              taffy layout
                                                       │
                                         cosmic-text + tiny-skia
                                                       │
                                                  one frame
```

The JS runtime owns state, components, and events. Rust owns pixels. The
boundary is one JSON patch per frame (protocol v0), not a call per property.
See [docs/native/architecture.md](docs/native/architecture.md) and
[docs/native/protocol.md](docs/native/protocol.md).

## Commands

| Command | What it does |
|---|---|
| `tardis init` | Create `app.tsx`, `package.json`, `tsconfig.json` |
| `tardis build [entry]` | Bundle TSX to `dist/app.js` |
| `tardis run [entry]` | Build and open the native window |
| `tardis dev [entry]` | Build, run, and restart on `.ts`/`.tsx` changes |
| `tardis screenshot [entry]` | Render one frame to PNG; `--dump` writes the scene JSON |

Options: `--out`, `--minify`, `--width`, `--height`, `--dump`.

Entry resolution: `app.tsx`, `src/app.tsx`, `index.tsx`, `src/index.tsx`.

## Limits (v0)

- Props are reactive getters. Use `props.title()` in JSX and memos.
- Styles are objects, not CSS. Supported keys are listed in
  [docs/TSX.md](docs/TSX.md#styles).
- Dynamic arrays rebuild when they change; keyed reuse is not implemented.
- No keyboard, focus, IME, clipboard, images, scrolling, or text clipping yet.
- The window is 1x scale; HiDPI is not handled.
- Only the bundled Liberation Sans family is guaranteed.

## Docs

- [TSX guide](docs/TSX.md)
- [Architecture](docs/native/architecture.md)
- [Frame protocol](docs/native/protocol.md)
- [Decisions](docs/DECISIONS.md)
- [TODO](docs/TODO.md)
- [ADR 0003 — TSX-only v2](docs/adr/0003-tsx-only-v2.md)
