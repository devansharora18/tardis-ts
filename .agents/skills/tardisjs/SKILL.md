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
- `VirtualList({ items, rowHeight, height, renderRow, overscan?, scrollTop?, onScroll? })`
- `createRouter({ initial?, history?, scrollRestoration? })`,
  `Router({ router, routes, fallback?, guards?, lazy?, loading?, error? })`,
  `Link({ router, to, children })`, `matchPath(pattern, path)`
- `focusNode(id)`; keyboard handlers `onKeyDown`/`onKeyUp`; wheel `onWheel`
- `TextField({ value?, onChange?, placeholder?, ariaLabel?, width?, disabled?, multiline?, rows?, onSubmit?, onBlur?, onFocus? })`
- `Checkbox({ checked, onChange?, label?, ariaLabel? })`
- `Select({ value, options, onChange, placeholder?, ariaLabel?, width?, disabled? })`
- `RadioGroup({ value, options, onChange, ariaLabel?, direction? })`
- accessibility props: `role`, `tabIndex`, `aria-*` (web attributes, native stored)
- `createForm({ initial, validate?, validateAsync?, onSubmit?, onSubmitError? })`
  → values/touched/errors, submitting/submitted, submitError, submit/reset,
  `field(key)`
- `FormField({ label, error?, hint?, children })`
- `createResource((signal) => Promise, { initial? })` → data/error/loading/
  refetch/dispose, aborts on refetch/dispose
- `renderToString(App)`, `renderDocument(body, { title?, head?, script? })`,
  `hydrate(App, container, { onMismatch? })` from `tardisjs/ssr`
- `ScrollView({ height, contentHeight, scrollTop?, onScroll?, children })`
- `Boundary({ content, fallback?, onError?, onReset? })` — catches render and
  subtree effect errors
- `Dialog({ open, onClose, title?, width?, children })` — modal + focus trap
- `installDevtools({ container?, startOpen? })` from `tardisjs/devtools`
- native `--scale` (headless) and window scale-factor support

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
nearest clickable ancestor.

Pointer down focuses a node; `onKeyDown`/`onKeyUp` bubble to the nearest handler.
Enter/Space activate the nearest clickable ancestor. Web listens on `window`;
native maps winit keyboard input. Wheel events reach `onWheel`. IME composition
is not implemented.

## Forms, resources, accessibility

`createForm` owns values/touched/errors/submitting; `FormField` renders
label/error/hint; errors show after touch or submit. `createResource` starts a
request immediately and ignores stale responses (no AbortSignal yet).

`TextField` is controlled/uncontrolled with caret, selection, and optional
multiline. Shortcuts: arrows/Home/End, Shift+movement selection, Ctrl/Cmd+A,
Ctrl/Cmd+C/X/V, Alt+arrows by word, Ctrl/Cmd+Home/End document ends; Enter
submits single-line, ctrl+enter submits multiline. IME preedit/commit is bridged
on both hosts (web uses a hidden textarea). Tab/Shift+Tab traverse `tabIndex >= 0`
nodes in document order. Clipboard uses memory + `navigator.clipboard` on web,
`arboard` natively when a display exists. `Checkbox` toggles on click/Enter/Space with
`role="checkbox"`/`aria-checked`.

Intrinsic tags render as real web elements (`button`, `h1`, `p`, `ul`, ...).
`role`, `tabIndex`, and `aria-*` become an `a11y` op. Native builds an AccessKit
tree from them plus scene tags, focus, and layout bounds; focus/click/set-value
actions dispatch back into JS.

## Server rendering

Export the component and guard the client render with
`typeof document !== 'undefined'` (or `|| typeof __tardis_flush === 'function'`
for native). Server: `renderToString(App)`, then `renderDocument(body, {...})`.
Client: `hydrate(App, document.getElementById('app')!)`.

Hydration is a verified remount: staging render, text compare, warning on
mismatch, then replace server nodes and move listeners. No node adoption,
streaming, or data prefetch. Base CSS comes from `renderDocument`.

## Scroll, boundaries, HiDPI

`ScrollView` clips content, scrolls on wheel, and draws an indicator; pass
`contentHeight` explicitly. `Boundary` catches render errors and effect errors
from effects created inside its content. Native HiDPI keeps layout logical and scales raster/text/
bounds; `tardis-native --scale 2` renders physical screenshots.

## Large lists, routing, images

- `VirtualList` mounts only the visible window (~40 nodes for 10,000 rows) and
  scrolls on wheel events. Use it for any long list.
- `createRouter` + `Router` + `Link` work with memory history natively and
  `window.history`/`popstate` on web. Routes support `:param` and `*`.
- Native `<img src="path.png" style={{width,height}} />` decodes PNGs and caches
  them; web uses `<img>`. Explicit dimensions are required.

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

## Performance

Release core harness (`cargo run -p tardis-bench --release -- --rows 1000`):

- 1k update 1.97 ms; 10k fully mounted update 23.0 ms; 10k paint 1.87 ms.
- Virtualized 10k window: 0.55 ms update, 3.1 ms mount.
- Patch apply is ~0.003 ms for style/text updates (no scene clone); the taffy
  tree is reused. Fully mounted 10k is a stress case, not the production shape.

Same-machine startup/size: Tardis 451 ms / 7.3 MB vs Dioxus 0.6.3 desktop
625 ms / 8.7 MB (first paint). Startup/size only; no frame-time head-to-head.
Do not claim one.

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

- `overflow: hidden` clips rectangles; `textOverflow: 'ellipsis'` truncates one line.
- Native images are PNG only; ScrollView clips and offsets, no native scroll node.
- TextField has selection/multiline/IME; pointer caret placement is missing.
- Devtools shows the scene and patch stream; no time travel or owner view.
- ScrollView thumb is draggable; content height is still explicit.
- Native AccessKit tree exists; verify screen readers on each host.
- `--backend wgpu` presents CPU frames through wgpu; no GPU geometry yet.
- Clipboard is system-backed when available; otherwise memory.
- Hydration is a remount, not node adoption; no streaming SSR.
- No Dioxus frame-time benchmark.
- Sending a native bundle through a headless-only build? Keep the window build
  in `native/target/debug`; tests use `native/target/headless`.
- The npm tarball ships Rust sources; platform binaries are still TODO.
