// Cross-platform router.
//
// The core is a path signal + a route table. Browser history is an adapter;
// native uses an in-memory stack. Routes use `:param` segments and `*` as a
// terminal catch-all.

import { dynamic, jsx } from './jsx'
import { createSignal } from './signals'
import type { DynamicValue, SceneNode } from './types'

export type RouteParams = Record<string, string>
export type RouteRenderer = (params: RouteParams) => SceneNode
export type RouteTable = Record<string, RouteRenderer>

export interface Router {
  path: () => string
  previous: () => string
  navigate: (to: string) => void
  back: () => void
  forward: () => void
  dispose: () => void
}

export interface RouterOptions {
  initial?: string
  /** Use window.history and popstate when running in a browser. */
  history?: boolean
  /** Save/restore window scroll positions per path. Defaults to true in browsers. */
  scrollRestoration?: boolean
}

export interface GuardContext {
  to: string
  from: string
  params: RouteParams
}

/** Return false to block, or a path string to redirect. */
export type RouteGuard = (context: GuardContext) => boolean | string

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
  const [previous, setPrevious] = createSignal('/')
  const stack: string[] = [initial]
  let index = 0
  const scrollPositions = new Map<string, number>()
  const scrollRestoration =
    options.scrollRestoration !== false && useHistory && browser()

  const rememberScroll = (): void => {
    if (scrollRestoration) scrollPositions.set(path(), window.scrollY || 0)
  }
  const restoreScroll = (to: string): void => {
    if (!scrollRestoration) return
    const top = scrollPositions.get(to) ?? 0
    queueMicrotask(() => window.scrollTo(0, top))
  }
  const moveTo = (next: string): void => {
    const from = path()
    if (next === from) return
    rememberScroll()
    setPrevious(from)
    setPath(next)
  }

  if (useHistory) {
    if (typeof window.history.scrollRestoration === 'string') {
      window.history.scrollRestoration =
        options.scrollRestoration === false ? 'auto' : 'manual'
    }
    const onPop = (): void => {
      const next = normalize(window.location.pathname)
      rememberScroll()
      setPrevious(path())
      setPath(next)
      restoreScroll(next)
    }
    window.addEventListener('popstate', onPop)
    if (normalize(window.location.pathname) !== initial) {
      window.history.replaceState({}, '', initial)
    }
    return {
      path,
      previous,
      navigate(to: string): void {
        const next = normalize(to)
        if (next === path()) return
        rememberScroll()
        window.history.pushState({}, '', next)
        setPrevious(path())
        setPath(next)
        restoreScroll(next)
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
    previous,
    navigate(to: string): void {
      const next = normalize(to)
      if (next === path()) return
      stack.splice(index + 1)
      stack.push(next)
      index = stack.length - 1
      moveTo(next)
    },
    back(): void {
      if (index === 0) return
      index--
      moveTo(stack[index]!)
    },
    forward(): void {
      if (index >= stack.length - 1) return
      index++
      moveTo(stack[index]!)
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
  /** Guards keyed by route pattern. */
  guards?: MaybeGetter<Record<string, RouteGuard>>
  /** Loaders keyed by route pattern; resolved once and cached. */
  lazy?: MaybeGetter<Record<string, () => Promise<RouteRenderer | { default: RouteRenderer }>>>
  loading?: () => SceneNode | null
  error?: (error: Error) => SceneNode | null
}

/** Renders the first route that matches the router's current path. */
export function Router(props: RouterProps): DynamicValue {
  const [version, setVersion] = createSignal(0)
  const loaded = new Map<string, RouteRenderer>()
  const pending = new Set<string>()
  const failures = new Map<string, Error>()

  return dynamic(() => {
    version()
    const router = read(props.router, null as unknown as Router)
    if (!router) return null
    const routes = read(props.routes, {} as RouteTable)
    const guards = read(props.guards, {} as Record<string, RouteGuard>)
    const lazy = read(
      props.lazy,
      {} as Record<
        string,
        () => Promise<RouteRenderer | { default: RouteRenderer }>
      >
    )
    const current = router.path()
    for (const [pattern, render] of Object.entries(routes)) {
      const params = matchPath(pattern, current)
      if (!params) continue

      const guard = guards[pattern]
      if (guard) {
        const result = guard({ to: current, from: router.previous(), params })
        if (result === false) return props.fallback ? props.fallback() : null
        if (typeof result === 'string' && normalize(result) !== current) {
          queueMicrotask(() => router.navigate(result))
          return null
        }
      }

      const loader = lazy[pattern]
      if (loader && !loaded.has(pattern)) {
        const failure = failures.get(pattern)
        if (failure) return props.error ? props.error(failure) : null
        if (!pending.has(pattern)) {
          pending.add(pattern)
          loader()
            .then((module) => {
              loaded.set(
                pattern,
                typeof module === 'function' ? module : module.default
              )
            })
            .catch((reason: unknown) => {
              failures.set(
                pattern,
                reason instanceof Error ? reason : new Error(String(reason))
              )
            })
            .finally(() => {
              pending.delete(pattern)
              setVersion((value) => value + 1)
            })
        }
        return props.loading ? props.loading() : null
      }

      const renderer = loaded.get(pattern) ?? render
      return renderer(params)
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
      role: 'link',
      tabIndex: 0,
      onClick: () => {
        read(props.router, null as unknown as Router)?.navigate(read(props.to, '/'))
      },
    },
    ...(props.children ?? [])
  )
}
