# TSX guide

TardisJS v2 is TSX only. There is no `.tardis` file, no custom grammar, and no
directive syntax. If you know React and signals, you know the surface.

## Targets

The same entry runs on Linux, macOS, Windows, and the web. Mobile is deferred.

```tsx
import '@devansharora18/tardisjs/web' // no-op outside a browser
import { createSignal, render } from '@devansharora18/tardisjs/scene'
```

The web import boots the DOM host when `document` exists. In QuickJS it is a
no-op and the native host handles the same scene patches.

```sh
tardis dev --target web            # browser, with reload
tardis build --target web          # dist/web/app.js + index.html
tardis preview                     # serve dist/web
tardis dev                         # native window
tardis screenshot -o shot.png      # native headless PNG
```

Layout differs by host: native uses taffy and cosmic-text; web uses CSS flex
and the browser's text engine. Styles, line heights, and `box-sizing` are kept
aligned, but font metrics and line breaks can differ.


## Signals

Components run once. State is a signal; reading it inside JSX creates a binding.

```tsx
import { createSignal, createMemo, createEffect, batch } from '@devansharora18/tardisjs/scene'

const [count, setCount] = createSignal(0)
const double = createMemo(() => count() * 2)

createEffect(() => console.log('count is', count()))

batch(() => {
  setCount(1)
  setCount(2) // one effect run
})
```

`setCount` accepts a value or an updater: `setCount((n) => n + 1)`.

Reactive scopes: `createRoot((dispose) => { ... })` and `onCleanup(fn)`.
Dynamic regions use these internally, so components mounted inside `{...}` stop
their effects when they are replaced.

## JSX

Intrinsic elements are a closed set:

```
div section main header footer nav ul li
span label strong em p h1 h2 h3 h4 h5 h6
button img
```

Anything capitalized is a component. Fragments work:

```tsx
function App() {
  return (
    <>
      <h1>Title</h1>
      <p>Body</p>
    </>
  )
}
```

Control flow is JavaScript. There are no `$if`/`$each` directives:

```tsx
<div>
  {ready() ? <p>Loaded</p> : <p>Loading…</p>}
  {items().map((item) => (
    <li key={item.id}>{item.name}</li>
  ))}
</div>
```

## Props

Static attributes are strings. Braced expressions are compiled to getters so a
component can read them inside a binding without re-running.

```tsx
function Card(props) {
  return (
    <div>
      <h2>{props.title()}</h2>
      <p>{props.body()}</p>
    </div>
  )
}

<Card title={title()} body={body()} />
```

Use `props.title()`, not `props.title`. Destructuring reads the getter once and
loses reactivity.

The compiler does **not** wrap:

- event props (`onClick`, `onPress`, any `on[A-Z]…`),
- `key`,
- `ref`,
- function-valued props (`renderItem={(row) => ...}`).

Children are passed as an array in `props.children`.

## Styles

Styles are plain objects with flexbox properties. There is no CSS parser and no
stylesheet.

```tsx
<div
  style={{
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#111111',
    borderRadius: 10,
  }}
>
  <p style={{ color: '#a1a1a1' }}>Hello</p>
</div>
```

Supported keys:

```
width height minWidth maxWidth minHeight maxHeight
padding paddingTop paddingRight paddingBottom paddingLeft
margin marginTop marginRight marginBottom marginLeft
flexDirection justifyContent alignItems gap
flexGrow flexShrink flexWrap
position top right bottom left
backgroundColor borderRadius opacity overflow display
fontSize fontWeight color lineHeight textAlign
```

Values are numbers (points), booleans where noted, and colors as `#rgb`,
`#rrggbb`, or `#rrggbbaa`.

Text properties inherit: a `color` or `fontSize` on a container applies to text
children that do not override it.

`display: 'none'` removes a node from layout.

## Events

```tsx
<button onClick={() => setCount((n) => n + 1)}>+1</button>
<button onPress={open}>Open</button>
```

`onClick` and `onPress` are equivalent. The native core hit-tests the pointer to
the deepest node; the runtime walks up to the nearest node with a click handler.
That is why clicking the text inside a button still fires the button handler.

Pointer moves, keyboard, focus, IME, and text input are not wired yet.

## Rendering

Call `render` once at the entry point:

```tsx
import '@devansharora18/tardisjs/web'
import { render } from '@devansharora18/tardisjs/scene'

render(() => <App />)
```

`render` returns `{ root, dispose }`. `dispose` unmounts the tree and stops its
effects. On native the QuickJS host must be present; on web the import above
installs the DOM host.

## Text

A text tag (`p`, `h1`, `span`, …) becomes a single text node when all children
are strings or expressions. Mixed content such as `<p>Hello <strong>world</strong></p>`
becomes a row container so the nested elements keep their own styles.

Expressions inside a text tag are concatenated. If an expression returns a
scene node, use a container tag instead; text tags ignore non-primitive values.

## Compiler rules

- Non-event expression attributes become `() => expression`.
- Expression children become dynamic regions.
- JSX inside ternaries and `.map` callbacks is transformed recursively.
- Whitespace follows JSX rules: indentation collapses, inline spaces survive.
- Unknown intrinsic tags throw at compile time.
- TypeScript syntax errors fail the build; the compiler does not emit garbage.

## Large lists

Use `VirtualList` for long data sets. Only the visible window plus overscan is
mounted in the scene.

```tsx
import { VirtualList } from '@devansharora18/tardisjs/scene'

<VirtualList
  items={() => rows}
  rowHeight={40}
  height={600}
  renderRow={(row, index) => (
    <div style={{ height: 40, paddingLeft: 12 }}>
      <span>{row}</span>
    </div>
  )}
/>
```

`items`, `rowHeight`, and `height` may be values or getters. For a controlled
list, pass `scrollTop={() => offset()}` and `onScroll={(next) => setOffset(next)}`.
Wheel events over the list move the window; native and web both dispatch them.

## Routing

```tsx
import { createRouter, Router, Link } from '@devansharora18/tardisjs/scene'

const router = createRouter({ initial: '/', history: true })

<Router
  router={router}
  routes={{
    '/': () => <Home />,
    '/user/:id': (params) => <User id={params.id} />,
  }}
  fallback={() => <NotFound />}
/>
```

`history: true` uses `window.history` and `popstate`; without it the router uses
an in-memory stack. `router.navigate('/user/42')`, `back()`, and `forward()` work
on both hosts. `<Link router={router} to="/about">About</Link>` navigates on
click. `matchPath('/user/:id', '/user/42')` returns `{ id: '42' }`.

## Keyboard and focus

Any node can take `onKeyDown` / `onKeyUp`. Pointer down focuses the deepest node;
events bubble to the nearest handler. Enter and Space activate the nearest
`onClick`/`onPress` ancestor. `focusNode(id)` sets focus from code.

```tsx
<div onKeyDown={(event) => {
  if (event.key === 'ArrowDown') setIndex(index() + 1)
}}>
```

Web listens on `window`; native listens for winit keyboard input. Text input,
IME, and clipboard are not implemented.

## Scroll containers

```tsx
<ScrollView height={300} contentHeight={1200}>
  <p>Long content…</p>
</ScrollView>
```

Wheel events scroll the inner view; the parent clips. `contentHeight` is explicit
because layout measurement does not flow back to JS yet. Drag the scrollbar thumb
to scroll; it exposes `role="scrollbar"` and `aria-valuenow`. Controlled use:
`scrollTop={() => offset()}` plus `onScroll`.

## Error boundaries

```tsx
<Boundary
  content={() => <App />}
  fallback={(error, reset) => (
    <button onClick={reset}>Retry: {error.message}</button>
  )}
/>
```

The content factory runs inside the boundary; render throws and later errors
from effects created inside it switch to the fallback. `onError` receives the
error and `reset` clears it.

## Devtools

```ts
import { installDevtools } from '@devansharora18/tardisjs/devtools'

const devtools = installDevtools({ startOpen: true })
devtools.dispose()
```

The overlay shows the live scene tree (ids, tags, roles, text) and the last 12
patch frames. It is DOM-only and intended for development.

## HiDPI

Native windows read the winit scale factor: layout stays in logical pixels while
raster, text, the surface, and pointer coordinates scale. Headless screenshots
accept `--scale 2` (logical 800×600 becomes a 1600×1200 PNG). Web scaling is the
browser's CSS pixel handling.

## Forms

```tsx
import { Checkbox, TextField } from '@devansharora18/tardisjs/scene'

const [name, setName] = createSignal('')
const [subscribe, setSubscribe] = createSignal(false)

<TextField
  value={() => name()}
  onChange={setName}
  placeholder="Name"
  ariaLabel="Name"
  onSubmit={() => submit()}
/>
<Checkbox
  checked={() => subscribe()}
  onChange={setSubscribe}
  label="Subscribe"
/>
```

`TextField` is controlled (`value` + `onChange`) or uncontrolled. It supports
Home/End/arrows/Backspace/Delete, Shift+movement selection, Ctrl/Cmd+A/C/X/V,
Alt+arrows by word, and Ctrl/Cmd+Home/End for document ends. Pass
`multiline` and optional `rows` (minimum visible rows) for a growing text area:
Enter inserts a newline, Ctrl/Cmd+Enter calls `onSubmit`, and Up/Down keep the
column. Selection is painted as a highlighted run on both hosts. IME
composition is bridged on web (hidden editable + composition events) and native
(winit IME events): the preedit is shown at the caret and the committed text is
inserted. `Checkbox` toggles on click, Enter, or Space and exposes
`role="checkbox"`/`aria-checked`.

Tab moves focus through scene nodes with `tabIndex >= 0` in document order;
Shift+Tab reverses. Disabled nodes (`aria-disabled="true"`) are skipped.

`Select` and `RadioGroup` share the same option shape:

```tsx
const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
]

<Select value={() => fruit()} options={options} onChange={setFruit} />
<RadioGroup value={() => fruit()} options={options} onChange={setFruit} />
```

`Select` opens with click/Enter/Space, moves with arrows/Home/End, and closes on
Escape or selection. `RadioGroup` keeps one tab stop and moves selection with
arrows, skipping disabled options.

For validation, `createForm` owns values, touched fields, errors, submitting,
submit errors, and reset:

```tsx
import { createForm, FormField } from '@devansharora18/tardisjs/scene'

const form = createForm({
  initial: { name: '' },
  validate: (values) =>
    values.name.trim() ? {} : { name: 'Name is required' },
  onSubmit: async (values) => save(values),
})
const name = form.field('name')

<FormField label="Name" error={() => name.error()}>
  <TextField
    value={() => name.value()}
    onChange={name.onChange}
    onBlur={name.onBlur}
    ariaLabel="Name"
  />
</FormField>
<button onClick={() => form.submit()}>
  {form.submitting() ? 'Submitting…' : 'Submit'}
</button>
```

`field.error()` is hidden until the field is touched or the form is submitted.
Pass function-valued props with arrow wrappers (`error={() => name.error()}`);
event props such as `onChange` are not wrapped.

Async data uses `createResource`:

```tsx
const posts = createResource(() => fetch('/api/posts').then((r) => r.json()))

if (posts.loading()) return <p>Loading…</p>
if (posts.error()) return <p>{posts.error()!.message}</p>
<For each={posts.data() ?? []}>...</For>
```

`refetch()` starts a new request; an older response that finishes later is
ignored. The resource is disposed with its owner.

Accessibility props on any node: `role`, `tabIndex`, and `aria-*` (for example
`aria-label`, `aria-checked`). They are applied as DOM attributes on web and
stored in the native scene for a future accesskit tree.

Limits: no text selection, multiline, or IME yet. Focus is pointer/tab-based;
there is no spatial focus tree.

## Images

```tsx
<img src="./assets/logo.png" style={{ width: 120, height: 40 }} />
```

Native loads PNGs from the path (relative to the process working directory) and
caches the raster. Web uses the browser's `<img>`. Give images explicit width and
height; intrinsic sizing is not implemented.

## Server rendering

Export the component and guard the client render:

```tsx
export function App() {
  const [name] = createSignal('Ada')
  return <h1>Hello {name()}</h1>
}

if (typeof document !== 'undefined') render(() => <App />)
```

For an app that also targets native, use
`typeof document !== 'undefined' || typeof __tardis_flush === 'function'` so the
QuickJS host still boots it.

Server:

```ts
import { renderToString, renderDocument } from '@devansharora18/tardisjs/ssr'
import { App } from './app'

const body = renderToString(App)
const html = renderDocument(body, { title: 'My app', script: '/app.js' })
```

Client:

```ts
import { hydrate } from '@devansharora18/tardisjs/ssr'
hydrate(App, document.getElementById('app')!)
```

`renderDocument` includes the base CSS (`box-sizing`, semantic button/list
resets) and the dark page defaults. `renderToString` needs no DOM and restores
the previous `__tardis_flush`.

Hydration is a **verified remount**: the app renders into a detached staging
host, text content is compared, a mismatch warns (or calls `onMismatch`), and the
client tree replaces the server nodes. Bindings stay live. It does not adopt the
server nodes, stream, or prefetch data. There is no server-bundle CLI yet; call
the API from your Node server.

## Testing

The scene runtime is pure JavaScript. Set a fake host and assert patches:

```ts
globalThis.__tardis_flush = (json) => patches.push(JSON.parse(json))
```

End to end, build the app and use the native CLI:

```sh
tardis screenshot app.tsx -o shot.png --dump scene.json
```

`scene.json` contains every node with its computed rect and text, which is
stable enough for assertions. The window mode can be exercised under Xvfb:

```sh
xvfb-run -a cargo run --manifest-path native/Cargo.toml -- --bundle dist/app.js
```

The web host is pure DOM and testable with jsdom. The end-to-end suite builds a
web bundle, executes it in jsdom, and clicks the rendered button. Chrome is used
for a real-browser smoke check during development.

```sh
npx vitest run test/web test/compiler/web-bundle.test.ts
```

## Known boundaries

- Dynamic arrays are rebuilt, not keyed-diffed.
- `overflow: hidden` clips rectangularly; no ellipsis.
- Native images are PNG only and need explicit dimensions.
- Scroll offsets exist in the protocol but are not painted; `VirtualList`
  implements its own windowing with wheel input.
- Text input is single-line and caret-only; no selection, multiline, or IME.
- Clipboard is system-backed when available; otherwise in-memory.
- Native accessibility attributes are stored; accesskit is not wired.
- Resources are not abortable yet; stale responses are ignored, not cancelled.
- Forms are flat; no nested fields/arrays or async validation.
- Native window scaling is 1x.
- Web has no SSR/hydration; it is client-rendered.
- Web layout is CSS; native layout is taffy. Pixel parity is not guaranteed.
- Mobile is not started.
- No Dioxus head-to-head frame benchmark exists.
