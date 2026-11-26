# TSX guide

TardisJS v2 is TSX only. There is no `.tardis` file, no custom grammar, and no
directive syntax. If you know React and signals, you know the surface.

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
import { render } from '@devansharora18/tardisjs/scene'

render(() => <App />)
```

`render` returns `{ root, dispose }`. `dispose` unmounts the tree and stops its
effects.

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

## Known boundaries

- Dynamic arrays are rebuilt, not keyed-diffed.
- Text is not clipped to its box; `overflow` affects layout only.
- Images are placeholders.
- Scroll offsets exist in the protocol but are not painted.
- No keyboard/focus/IME/clipboard.
- Window scaling is 1x.
