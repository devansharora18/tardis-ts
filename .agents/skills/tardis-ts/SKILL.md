---
name: tardis-ts
description: Use when editing Tardis TS v2 apps or framework code. Tardis TS is a TSX-only UI framework for Linux, macOS, Windows, and web (signals, retained scene tree, Rust native renderer, DOM web host, QuickJS/native fetch) — not React, not the old .tardis blueprint DSL.
---

# Tardis TS v2

TSX-only. No `.tardis` files, no directives, no virtual DOM. Components run once;
signals bind updates to a retained scene tree. Two hosts consume the same patch
stream:

- **Native** — Rust core (taffy, cosmic-text, tiny-skia) inside winit/softbuffer
  or wgpu, app logic in embedded QuickJS.
- **Web** — DOM host maps patches to real elements and CSS flex.

Mobile is deferred.

## Reference router

| Open | When |
|---|---|
| `reference/app-shape.md` | starting an app, props, children, dynamic regions |
| `reference/components.md` | TextField, VirtualList, ScrollView, Dialog, Select, accessibility |
| `reference/forms-data.md` | createForm, createResource, createMutation, errors |
| `reference/routing-ssr.md` | guards, lazy routes, SSR and structural hydration |
| `reference/native-web.md` | host differences, wgpu, storage, fetch, native a11y |
| `reference/examples.md` | the 16 example apps and how to build them |
| `reference/testing-benchmarks.md` | test suites and benchmark commands/results |
| `reference/pitfalls.md` | known traps and limitations |

## Repo map

- `src/compiler/tsx.ts` — TypeScript JSX transformer
- `src/compiler/bundle.ts` — esbuild bundler, native + web, `--css` shell link
- `src/scene/` — signals, JSX, scene tree, events, inputs, router, SSR
- `src/web/` — DOM host
- `src/cli/` — create/build/run/screenshot/dev/preview
- `native/crates/core` — patch decode, taffy, text, raster
- `native/crates/js` — QuickJS host, `localStorage` and `fetch` bridges
- `native/crates/cli` — headless PNG + winit/softbuffer/wgpu
- `examples/` — 15 cross-platform apps + web-only PDF editor
- `site/` — landing page and docs site (built with Tardis TS)
- `docs/` — architecture, protocol, benchmarks, comparisons, ADRs

## App shape

```tsx
import '@devansharora18/tardis-ts/web' // no-op in QuickJS
import { createSignal, render } from '@devansharora18/tardis-ts/scene'

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

Props from the compiler are getters. Use `dynamic()` for changing arrays and
conditionals. Styles are objects; `className` is web-only. List/card styles follow
the examples in `docs/TSX.md`.

## API quick reference

- `createSignal(v) -> [get, set]`; setters accept `(prev) => next`
- `createMemo(fn)`, `createEffect(fn)`, `batch(fn)`, `untrack(fn)`, `onCleanup(fn)`
- `render(() => <App />) -> { root, dispose }`
- `dynamic(fn)`, `Fragment`, `jsx`
- `VirtualList`, `ScrollView`, `TextField`, `Checkbox`, `Select`, `RadioGroup`,
  `Dialog`, `Boundary`
- Router: `createRouter`, `Router`, `Link`, `matchPath`
- Forms: `createForm`, `FormField`; data: `createResource`, `createMutation`
- SSR: `renderToString`, `renderDocument`, `hydrate`
- Devtools: `installDevtools` from `@devansharora18/tardis-ts/devtools`
- Events: `onClick`, `onPointerDown/Move/Up`, `onKeyDown`, `onWheel`, `onText`,
  `onTab`; pointer events include `localX/localY`
- Accessibility: `role`, `tabIndex`, `className`, `aria-*`

## CLI

```
tardis-ts create [dir]        # interactive: platforms, styling, template, pm, install, git
tardis-ts init
tardis-ts build [entry] --target native|web --out <path> --minify --css <css>
tardis-ts run [entry] --width 800 --height 600 --backend softbuffer|wgpu --scale 2
tardis-ts dev [entry] --target native|web --port 4173 --css <css>
tardis-ts screenshot [entry] -o shot.png --dump scene.json --scale 2
tardis-ts preview --dir dist/web --port 4173
```

Default entry: `app.tsx`, `src/app.tsx`, `index.tsx`, `src/index.tsx`.
Native lookup: `TARDIS_TS_NATIVE_BIN`, `native/target/{release,debug}`,
`node_modules/@devansharora18/tardis-ts-<platform>-<arch>/bin/tardis-ts-native`.

## Current measured truth

- 10k fully mounted browser: Tardis 8.3 fps vs Dioxus 12.3 vs React 6.0 vs
  Electron 4.1. **Tardis loses to Dioxus.**
- 100k virtualized sheet: Tardis 60.2 fps vs Dioxus 60.3. **Tie.**
- Editor startup/RSS: Tardis 410 ms/45 MiB vs Zed 624 ms/363 MiB.
- Desktop counter startup/size: Tardis 451 ms/7.3 MB vs Dioxus 625 ms/8.7 MB.
- Full-list browser and sheet details: `docs/BENCHMARKS.md`, `docs/SHEETS.md`,
  `docs/EDITORS.md`.

## Testing

```sh
npm test
npx tsc --noEmit
npm run build
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Native e2e builds `native/target/headless`. Run native windows with
`env -u WAYLAND_DISPLAY DISPLAY=:N WINIT_UNIX_BACKEND=x11` under Xvfb; otherwise
winit may choose a Wayland display that is not captured.

## Gotchas

See `reference/pitfalls.md`. The short list:

- DOM attribute is `data-tardis-ts`; host globals are `__tardis_ts_*`.
- Inline web styles beat CSS classes; use `!important` in web-only skins.
- `className`/Tailwind applies on web only; native uses style objects.
- No pointer caret placement, keyed diff, streaming SSR, or GPU geometry yet.
- PDF editor is web-only; native file dialogs are not implemented.
- Hydration adopts nodes structurally; it is not streaming.
- Never change a benchmark workload after seeing a loss.
