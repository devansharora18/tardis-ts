# API reference

All runtime imports come from `@devansharora18/tardis-ts/scene` unless noted.
The package is TSX-native: components run once and bind to a retained scene tree.

## Reactivity

| API | Contract |
|---|---|
| `createSignal(value)` | `[get, set]`; setter accepts a value or `(previous) => next` |
| `createMemo(fn)` | cached derived value; recomputes when dependencies change |
| `createEffect(fn)` | runs after mount and when dependencies change; may return cleanup |
| `batch(fn)` | coalesces effects until `fn` returns |
| `untrack(fn)` | reads signals without subscribing |
| `createRoot(fn)` | creates an owner; `fn(dispose)` |
| `onCleanup(fn)` | registers cleanup with the current owner |
| `flushNow()` | synchronously flushes queued scene patches |

## Rendering

- `render(factory) -> { root, dispose }`
- `dynamic(factory)` — reactive region; return a node, array, string, or null
- `jsx(type, props, ...children)` — compiler target; components are functions
- `Fragment` — transparent grouping

Styles are objects. Web-only `className` maps to the `class` attribute; native
ignores it. Events are `onClick`, `onPress`, `onPointerDown/Move/Up`,
`onKeyDown/Up`, `onTab`, `onWheel`, `onText`, `onFocus`, `onBlur`.

## Components

### TextField

```ts
TextField({
  value?, onChange?, placeholder?, ariaLabel?, width?, disabled?,
  multiline?, rows?, fontFamily?, tabInserts?, autoIndent?, wrap?,
  onCaretChange?, highlightLine?, lineStyle?, onKeyDown?, onSubmit?,
  onBlur?, onFocus?
})
```

Controlled (`value` + `onChange`) or uncontrolled. Selection, Shift+movement,
Ctrl/Cmd+A/C/X/V, IME preview/commit, Alt+arrow word movement, Ctrl/Cmd+Home/End.
Enter submits single-line; multiline inserts a newline; Ctrl/Cmd+Enter submits.
`highlightLine` returns `{ start, end, color?, backgroundColor?, fontWeight? }[]`.

Theme props for light surfaces: `backgroundColor`, `color`, `placeholderColor`,
`selectionColor`, `caretColor`, `borderColor`, `borderWidth`, `borderRadius`,
`fontSize`, `lineHeight`, `padding`, `height`. The defaults preserve the
original dark field.

### Checkbox, Select, RadioGroup

```ts
Checkbox({ checked, onChange?, label?, ariaLabel? })
Select({ value, options, onChange, placeholder?, ariaLabel?, width?, disabled? })
RadioGroup({ value, options, onChange, ariaLabel?, direction? })
```

Option shape: `{ value: string; label: string; disabled?: boolean }`.
Select supports click/Enter/Space, arrows, Home/End, Escape.
RadioGroup uses roving tab focus and skips disabled options.

### VirtualList and ScrollView

```ts
VirtualList({ items, rowHeight, height, renderRow, overscan?, scrollTop?, onScroll? })
ScrollView({ height, contentHeight, scrollTop?, onScroll?, showScrollbar?, children })
```

VirtualList mounts visible rows plus overscan. ScrollView clips and offsets an
absolute inner view; `contentHeight` is explicit; the thumb is draggable.

### Dialog and Boundary

```ts
Dialog({ open, onClose, title?, width?, children })
Boundary({ content, fallback?, onError?, onReset? })
```

Dialog traps Tab, closes on Escape, and restores focus. Boundary catches render
errors and errors from effects created inside its content.

## Forms and data

`createForm(options)` returns `values`, `errors`, `touched`, `submitting`,
`submitted`, `submitError`, `setValue`, `blur`, `submit`, `reset`, `field(key)`.

Options: `initial`, `validate`, `validateAsync`, `onSubmit`, `onSubmitError`.
`FormField({ label, error?, hint?, children })` renders label/control/error/hint.

`createResource(fetcher, { initial? })` returns `data`, `error`, `loading`,
`refetch`, `dispose`. The fetcher receives an `AbortSignal`; the previous request
is aborted on refetch and dispose; stale responses are ignored.

`createMutation(fn, { onSuccess?, onError?, initial? })` returns `data`, `error`,
`loading`, `mutate`, `reset`, `dispose`. The latest call wins.

## Routing

`createRouter({ initial?, history?, scrollRestoration? })` returns `path`,
`previous`, `navigate`, `back`, `forward`, `dispose`.

`Router({ router, routes, fallback?, guards?, lazy?, loading?, error? })`:
- `guards[pattern]({ to, from, params })` returns `boolean` or a redirect path.
- `lazy[pattern]()` returns a renderer; resolved once and cached.
- `loading`/`error` render lazy states.
`Link({ router, to, children, style })` renders a focusable link.
`matchPath(pattern, path)` supports `:param` and `*`.

## SSR

From `@devansharora18/tardis-ts/ssr`:

- `renderToString(factory)` — DOM-free string host.
- `renderDocument(body, { title?, head?, script? })` — full HTML document.
- `hydrate(factory, container, { onMismatch? })` — structural adoption of
  `[data-tardis-ts]` nodes, id remap, in-place patch, stale-node pruning.

Hydration is not streaming and does not prefetch data.

## Devtools

`installDevtools({ container?, startOpen? })` from
`@devansharora18/tardis-ts/devtools` shows the scene tree and patch frames.

## Native host

- `tardis-ts-native --bundle app.js --width 800 --height 600 --scale 2`
- `--backend softbuffer|wgpu`, `--headless`, `--out`, `--dump`, `--click`,
  `--wheel`
- Native `fetch` and `localStorage` shims are available in QuickJS.
- AccessKit exports roles, names, values, bounds, focus, and actions.

## CLI

- `create [dir]` — interactive scaffolder.
- `init [dir]` — starter in an existing directory.
- `build [entry] --target native|web --out --minify --css`
- `run [entry] --width --height --scale --backend`
- `dev [entry] --target --port --css`
- `screenshot [entry] --out --dump --scale`
- `preview --dir --port`

## Limits

Pointer caret placement, keyed reconciliation, streaming SSR, GPU geometry,
native file dialogs, animations, and mobile are not implemented. See `TODO.md`.
