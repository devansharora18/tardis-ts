// Cross-platform router.
//
// The core is a path signal + a route table. Browser history is an adapter;
// native uses an in-memory stack. Routes use `:param` segments and `*` as a
// terminal catch-all.

import { dynamic, jsx } from './jsx'
import { createSignal } from './signals'
import type { DynamicValue, SceneEvent, SceneNode } from './types'

export type RouteParams = Record<string, string>
export type RouteRenderer = (params: RouteParams) => SceneNode
export type RouteTable = Record<string, RouteRenderer>

export interface Router {
  path: () => string
  navigate: (to: string) => void
  back: () => void
  forward: () => void
  dispose: () => void
}

export interface RouterOptions {
  initial?: string
  /** Use window.history and popstate when running in a browser. */
  history?: boolean
}

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

function normalize(path: string): string {
  const clean = path.split('?')[0]!.split('#')[0]!
  return clean.startsWith('/') ? clean : `/${clean}`
}

export function matchPath(pattern: string, path: string): RouteParams | null {
  const patternParts = normalize(pattern).split('/').filter(Boolean)
  const pathParts = normalize(path).split('/').filter(Boolean)
  const params: RouteParams = {}
  for (let index = 0; index < patternParts.length; index++) {
    const part = patternParts[index]!
    if (part === '*') return params
    const value = pathParts[index]
    if (value === undefined) return null
    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(value)
      continue
    }
    if (part !== value) return null
  }
  return patternParts.length === pathParts.length ? params : null
}

function browser(): boolean {
  return typeof window !== 'undefined' && typeof window.history !== 'undefined'
}

export function createRouter(options: RouterOptions = {}): Router {
  const useHistory = options.history === true && browser()
  const initial = normalize(
    options.initial ?? (browser() ? window.location.pathname : '/')
  )
  const [path, setPath] = createSignal(initial)
  const stack: string[] = [initial]
  let index = 0

  if (useHistory) {
    const onPop = (): void => {
      setPath(normalize(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    if (normalize(window.location.pathname) !== initial) {
      window.history.replaceState({}, '', initial)
    }
    return {
      path,
      navigate(to: string): void {
        const next = normalize(to)
        if (next === path()) return
        window.history.pushState({}, '', next)
        setPath(next)
      },
      back(): void {
        window.history.back()
      },
      forward(): void {
        window.history.forward()
      },
      dispose(): void {
        window.removeEventListener('popstate', onPop)
      },
    }
  }

  return {
    path,
    navigate(to: string): void {
      const next = normalize(to)
      if (next === path()) return
      stack.splice(index + 1)
      stack.push(next)
      index = stack.length - 1
      setPath(next)
    },
    back(): void {
      if (index === 0) return
      index--
      setPath(stack[index]!)
    },
    forward(): void {
      if (index >= stack.length - 1) return
      index++
      setPath(stack[index]!)
    },
    dispose(): void {
      stack.length = 0
    },
  }
}

export interface RouterProps {
  router: MaybeGetter<Router>
  routes: MaybeGetter<RouteTable>
  fallback?: () => SceneNode | null
}

/** Renders the first route that matches the router's current path. */
export function Router(props: RouterProps): DynamicValue {
  return dynamic(() => {
    const router = read(props.router, null as unknown as Router)
    if (!router) return null
    const routes = read(props.routes, {} as RouteTable)
    const current = router.path()
    for (const [pattern, render] of Object.entries(routes)) {
      const params = matchPath(pattern, current)
      if (params) return render(params)
    }
    return props.fallback ? props.fallback() : null
  })
}

export interface LinkProps {
  router: MaybeGetter<Router>
  to: MaybeGetter<string>
  children?: unknown[]
  style?: unknown
}

/** A clickable text link that navigates the given router. */
export function Link(props: LinkProps): SceneNode {
  return jsx(
    'span',
    {
      style: () => ({
        color: '#7ee787',
        ...((read(props.style as MaybeGetter<Record<string, unknown>>, {}) as object) ?? {}),
      }),
      onClick: (event: SceneEvent) => {
        event
        read(props.router, null as unknown as Router)?.navigate(read(props.to, '/'))
      },
    },
    ...(props.children ?? [])
  )
}
