---
name: tardisjs
description: Use when editing TardisJS v2 apps or framework code. TardisJS is a TSX-only UI framework for Linux, macOS, Windows, and web (signals, retained scene tree, Rust native renderer, DOM web host) — not React, not the old .tardis blueprint DSL.
---

# TardisJS v2

TSX-only. No `.tardis` files, no directives, no virtual DOM. Components run once;
signals bind updates to a retained scene tree. Two hosts consume the same patch
stream:

- **Native** — Rust core (taffy, cosmic-text, tiny-skia) inside winit/softbuffer,
  app logic in embedded QuickJS.
- **Web** — DOM host maps patches to elements and CSS flex.

Mobile is deferred.

Repo map:

- `src/compiler/tsx.ts` — TypeScript JSX transformer
- `src/compiler/bundle.ts` — esbuild bundler, native + web targets
- `src/scene/` — signals, JSX factory, scene tree, dynamic regions, events
- `src/web/` — DOM host (`WebHost`, `installWebHost`)
- `src/cli/` — build/run/screenshot/dev/preview/init
- `native/crates/core` — patch decode, layout, text, raster
- `native/crates/js` — QuickJS host (`__tardis_flush`, `__tardis_event`)
- `native/crates/cli` — headless PNG + winit/softbuffer window
- `examples/native-counter/app.tsx` — cross-platform reference app

## App shape

```tsx
import '@devansharora18/tardisjs/web' // no-op in QuickJS
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
- `installWebHost(options?)` for custom web mounting; auto-installed on `#app`

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

Style objects only; no CSS files. Keys: `width height min/maxWidth/Height`,
`padding*`, `margin*`, `flexDirection justifyContent alignItems gap flexGrow
flexShrink flexWrap`, `position top right bottom left`, `backgroundColor
borderRadius opacity overflow display`, `fontSize fontWeight color lineHeight
textAlign`. Colors `#rgb`, `#rrggbb`, `#rrggbbaa`. Text styles inherit.

Native maps to taffy; web maps to CSS flex with `box-sizing: border-box`. Line
heights are explicit on block text; font metrics still differ by host.

## Events

`onClick` / `onPress` (equivalent). Native hit-tests the pointer; web delegates
`pointerdown`/`pointerup` through `closest('[data-tardis]')`. Both bubble to the
nearest clickable ancestor. No keyboard/focus/IME yet.

## CLI

```
tardis init
tardis build [entry] --target native|web --out <path> --minify
tardis run [entry] --width 800 --height 600
tardis dev [entry] --target native|web --port 4173
tardis screenshot [entry] -o shot.png --dump scene.json
tardis preview --dir dist/web --port 4173
```

Default entry: `app.tsx`, `src/app.tsx`, `index.tsx`, or `src/index.tsx`.
Native binary lookup: `TARDIS_NATIVE_BIN`, `native/target/{release,debug}`,
`node_modules/.bin/tardis-native` (`.exe` on Windows).

## Testing

- Compiler: `npx vitest run test/compiler/tsx.test.ts`
- Scene runtime: fake host with `globalThis.__tardis_flush = (json) => ...`
- Web host: jsdom (`test/web/dom.test.ts`)
- Web bundle: `test/compiler/web-bundle.test.ts` renders and clicks in jsdom
- Static server: `test/cli/server.test.ts`
- Native end to end: `test/cli/native-e2e.test.ts` (builds headless into
  `native/target/headless`)
- Window smoke: `xvfb-run -a target/debug/tardis-native --bundle dist/app.js`
  (unset `WAYLAND_DISPLAY`, set `WINIT_UNIX_BACKEND=x11` if needed)
- Real browser smoke: build `--target web`, `tardis preview`, open Chrome

## Gotchas

- Native window is 1x scale; no HiDPI.
- Text is not clipped to its box; native images are placeholders.
- No scroll painting, keyboard, focus, IME, or clipboard.
- No web SSR/hydration.
- Sending a native bundle through a headless-only build? Keep the window build
  in `native/target/debug`; tests use `native/target/headless`.
- The npm tarball ships Rust sources; platform binaries are still TODO.
