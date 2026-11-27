# App shape

Tardis TS apps are TSX files. Components are plain functions called once; they
bind reactive getters to a retained scene tree. There is no render loop in user
code.

```tsx
import '@devansharora18/tardis-ts/web'
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

Rules:

- Props from the compiler are getters: call them (`props.title()`), do not read once.
- Props passed directly to `jsx(Component, {...})` can be plain values or getters.
- Use `dynamic(() => ...)` for arrays, conditionals, and values that change.
- Use `createSignal` for state; effects run once per batch.
- `render` mounts a root. `dispose()` tears it down.
- Import `@devansharora18/tardis-ts/web` only for the web side-effect host; it is
  a no-op in QuickJS.
- Styles are objects, not CSS classes (except web-only `className`).

## Component children

`children` can arrive as JSX children or as a `children` prop. Both are mounted.

```tsx
<Card title="Hello"><p>Body</p></Card>
jsx(Card, { title: 'Hello', children: [jsx('p', {}, 'Body')] })
```

## Lists

Static arrays can be plain arrays. Dynamic arrays need `dynamic`. Keyed reuse is
not implemented, so a dynamic array rebuilds its subtree; use `VirtualList` for
large data.

## Host checks

- Native: `typeof document === 'undefined'`.
- Web: `typeof window !== 'undefined'`.
- Guard browser-only APIs in shared components.
