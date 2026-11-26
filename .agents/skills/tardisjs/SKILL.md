---
name: tardisjs
description: Use when editing TardisJS v2 apps or framework code. TardisJS is a TSX-only native UI framework (signals, retained scene tree, Rust renderer, embedded QuickJS) — not React, not the old .tardis blueprint DSL.
---

# TardisJS v2

TSX-only. No `.tardis` files, no directives, no virtual DOM. Components run once;
signals bind updates to a retained scene tree. A Rust core (taffy, cosmic-text,
tiny-skia) lays out and paints each frame.

Repo map:

- `src/compiler/tsx.ts` — TypeScript JSX transformer
- `src/compiler/bundle.ts` — esbuild plugin + IIFE bundler
- `src/scene/` — signals, JSX factory, scene tree, dynamic regions, events
- `src/cli/` — build/run/screenshot/dev/init
- `native/crates/core` — patch decode, layout, text, raster
- `native/crates/js` — QuickJS host (`__tardis_flush`, `__tardis_event`)
- `native/crates/cli` — headless PNG + winit/softbuffer window
- `examples/native-counter/app.tsx` — reference app

## App shape

```tsx
import { createSignal, render } from '@devansharora18/tardisjs/scene'

const [count, setCount] = createSignal(0)

function App() {
  return (
    <div style={{ padding: 32, gap: 12 }}>
      <h1>Count: {count()}</h1>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </div>
  )
}

render(() => <App />)
```

## API

- `createSignal(v) -> [get, set]`; setter accepts `(prev) => next`
- `createMemo(fn) -> get`, `createEffect(fn)`, `batch(fn)`, `untrack(fn)`
- `createRoot((dispose) => ...)`, `onCleanup(fn)`
- `render(() => <App />) -> { root, dispose }`
- `jsx`, `dynamic`, `Fragment` (compiler output; rarely used directly)

## JSX rules

- Intrinsics: `div section main header footer nav ul li span label strong em p h1..h6 button img`
- Capitalized tags are components; fragments `<>…</>` work.
- Control flow is JavaScript: ternaries, `&&`, `.map`.
- Non-event expression attributes compile to getters. Components read them:
  `props.title()`. Destructuring loses reactivity.
- Event props (`on[A-Z]…`), `key`, `ref`, and function-valued props are not wrapped.
- Expression children become dynamic regions; `{items().map(...)}` rebuilds on change
  (keyed reuse is not implemented).
- Unknown intrinsic tags throw at compile time.

## Styles

Style objects only; no CSS. Keys: `width height min/maxWidth/Height`,
`padding*`, `margin*`, `flexDirection justifyContent alignItems gap flexGrow
flexShrink flexWrap`, `position top right bottom left`, `backgroundColor
borderRadius opacity overflow display`, `fontSize fontWeight color lineHeight
textAlign`. Colors `#rgb`, `#rrggbb`, `#rrggbbaa`. Text styles inherit.

## Events

`onClick` / `onPress` (equivalent). Native hit-testing returns the deepest node;
the runtime bubbles to the nearest clickable ancestor. No keyboard/focus/IME yet.

## CLI

```
tardis init
tardis build [entry] --out dist/app.js --minify
tardis run [entry] --width 800 --height 600
tardis dev [entry]
tardis screenshot [entry] -o shot.png --dump scene.json
```

Default entry: `app.tsx`, `src/app.tsx`, `index.tsx`, or `src/index.tsx`.
Native binary lookup: `TARDIS_NATIVE_BIN`, `native/target/{release,debug}`,
or `node_modules/.bin/tardis-native`.

## Testing

- Compiler: `npx vitest run test/compiler/tsx.test.ts`
- Scene runtime: fake host with `globalThis.__tardis_flush = (json) => ...`
- End to end: `tardis screenshot --dump scene.json`, assert node rects/text
- Window smoke: `xvfb-run -a target/debug/tardis-native --bundle dist/app.js`
  (unset `WAYLAND_DISPLAY`, set `WINIT_UNIX_BACKEND=x11` if needed)

## Gotchas

- The window is 1x scale; no HiDPI.
- Text is not clipped to its box; images are placeholders.
- No scroll painting, keyboard, focus, IME, or clipboard.
- The npm tarball does not include the native binary yet; build it from the repo.
- `dist/` is ignored; `native/target/` must stay ignored.
