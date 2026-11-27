# Routing and SSR

## Router

```ts
const router = createRouter({ initial: '/', history: true })
<Router
  router={router}
  routes={{ '/': () => <Home />, '/user/:id': ({ id }) => <User id={id} /> }}
  guards={{ '/admin': () => signedIn() || '/login' }}
  lazy={{ '/settings': () => import('./settings').then((m) => m.Settings) }}
  loading={() => <p>Loading…</p>}
  error={(error) => <p>{error.message}</p>}
/>
```

- `path()`, `previous()`, `navigate`, `back`, `forward`, `dispose`.
- Guards return `false` to block or a string to redirect.
- Lazy loaders resolve once and cache; `loading`/`error` render fallbacks.
- `history: true` adds popstate and scroll restoration.

## Link

`Link({ router, to, children, style })` is a focusable `role="link"` node.

## SSR

```ts
import { renderToString, renderDocument } from '@devansharora18/tardis-ts/ssr'
const body = renderToString(App)
const html = renderDocument(body, { title: 'App', script: './app.js' })
```

`hydrate(App, container, { onMismatch })` adopts server `[data-tardis-ts]` nodes
structurally, remaps ids, patches style/text/ARIA in place, and removes unclaimed
nodes after the first flush. Hydration is not streaming.

The server host is DOM-free. Do not access `document` at module scope in an app
that is rendered on the server.
