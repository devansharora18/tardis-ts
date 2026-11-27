# Forms and async data

## createForm

```ts
const form = createForm({
  initial: { name: '', email: '' },
  validate: (values) => ({ ... }),
  validateAsync: async (values) => ({ ... }),
  onSubmit: async (values) => { ... },
  onSubmitError: (error) => { ... },
})
```

Returns `values`, `errors`, `touched`, `submitting`, `submitted`, `submitError`,
`setValue`, `blur`, `submit`, `reset`, and `field(key)`.

`field(key)` gives `value`, `onChange`, `onBlur`, `error`, ready for `TextField`.
Async validation runs after sync validation; a rejected submit sets `submitError`
instead of throwing.

## createResource

```ts
const user = createResource((signal) =>
  fetch('/api/user', { signal }).then((r) => r.json())
)
```

Returns `data`, `error`, `loading`, `refetch`, `dispose`. Last request wins. The
signal is aborted on refetch/dispose.

## createMutation

```ts
const save = createMutation((input: Values, signal?: AbortSignal) =>
  fetch('/api/save', { method: 'POST', body: JSON.stringify(input), signal })
)
await save.mutate(values)
```

Returns `data`, `error`, `loading`, `mutate`, `reset`, `dispose`. Latest call wins;
a new mutation or disposal aborts the previous request.

## Errors

Wrap async boundaries in `Boundary`. Effect errors created inside `content` route
to the boundary. Native `fetch` is provided by the QuickJS host; browser `fetch`
is native.
