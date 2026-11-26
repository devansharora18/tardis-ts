// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  createRouter,
  flushNow,
  jsx,
  Link,
  matchPath,
  render,
  Router,
  type RenderHandle,
} from '../../src/scene/index'

let host: WebHost | null = null
let handle: RenderHandle | null = null

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  host = createWebHost({ container: document.getElementById('app')! })
})

afterEach(() => {
  handle?.dispose()
  handle = null
  host?.dispose()
  host = null
  document.body.innerHTML = ''
})

function app(): HTMLElement {
  return document.getElementById('app')!
}

function click(element: Element): void {
  element.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }))
  element.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true }))
}

const routes = {
  '/': () => jsx('p', {}, 'home'),
  '/about': () => jsx('p', {}, 'about'),
  '/user/:id': (params: Record<string, string>) =>
    jsx('p', {}, `user ${params.id}`),
}

describe('matchPath', () => {
  it('matches static and parameterised paths', () => {
    expect(matchPath('/about', '/about')).toEqual({})
    expect(matchPath('/user/:id', '/user/42')).toEqual({ id: '42' })
    expect(matchPath('/user/:id', '/user')).toBeNull()
    expect(matchPath('/user/:id', '/user/42/extra')).toBeNull()
    expect(matchPath('/files/*', '/files/a/b/c')).toEqual({})
  })
})

describe('Router', () => {
  it('switches routes and exposes params', () => {
    const router = createRouter({ initial: '/' })
    handle = render(() => jsx(Router, { router, routes }))

    expect(app().textContent).toBe('home')
    router.navigate('/user/42')
    flushNow()
    expect(app().textContent).toBe('user 42')
    router.back()
    flushNow()
    expect(app().textContent).toBe('home')
  })

  it('renders a fallback when nothing matches', () => {
    const router = createRouter({ initial: '/missing' })
    handle = render(() =>
      jsx(Router, {
        router,
        routes,
        fallback: () => jsx('p', {}, 'not found'),
      })
    )
    expect(app().textContent).toBe('not found')
  })

  it('navigates from a Link', () => {
    const router = createRouter({ initial: '/' })
    const linkRoutes = {
      '/': () =>
        jsx(Link, { router, to: '/about' }, 'go to about'),
      '/about': () => jsx('p', {}, 'about page'),
    }
    handle = render(() => jsx(Router, { router, routes: linkRoutes }))
    const text = Array.from(app().querySelectorAll<HTMLElement>('[data-tardis-ts]'))
      .filter((element) => element.children.length === 0)
      .find((element) => element.textContent === 'go to about')
    expect(text).toBeDefined()
    click(text!)
    flushNow()
    expect(app().textContent).toBe('about page')
  })

  it('uses browser history when configured', () => {
    window.history.replaceState({}, '', '/')
    const router = createRouter({ initial: '/', history: true })
    router.navigate('/about')
    expect(window.location.pathname).toBe('/about')
    router.dispose()
  })
})

describe('router guards and lazy routes', () => {
  it('redirects when a guard returns a path', async () => {
    const router = createRouter({ initial: '/admin' })
    handle = render(() =>
      jsx(Router, {
        router,
        routes: {
          '/admin': () => jsx('p', {}, 'admin'),
          '/login': () => jsx('p', {}, 'login'),
        },
        guards: { '/admin': () => '/login' },
      })
    )
    await Promise.resolve()
    flushNow()
    expect(router.path()).toBe('/login')
    expect(app().textContent).toBe('login')
  })

  it('blocks a route when a guard returns false', () => {
    const router = createRouter({ initial: '/admin' })
    handle = render(() =>
      jsx(Router, {
        router,
        routes: { '/admin': () => jsx('p', {}, 'admin') },
        guards: { '/admin': () => false },
        fallback: () => jsx('p', {}, 'denied'),
      })
    )
    expect(app().textContent).toBe('denied')
  })

  it('loads a lazy route once and renders loading first', async () => {
    let resolve: ((renderer: (params: Record<string, string>) => any) => void) | null =
      null
    const router = createRouter({ initial: '/' })
    handle = render(() =>
      jsx(Router, {
        router,
        routes: { '/': () => jsx('p', {}, 'eager') },
        lazy: {
          '/': () =>
            new Promise((done) => {
              resolve = done
            }),
        },
        loading: () => jsx('p', {}, 'loading'),
      })
    )
    expect(app().textContent).toBe('loading')
    resolve!(() => jsx('p', {}, 'lazy'))
    await new Promise((done) => setTimeout(done, 0))
    flushNow()
    expect(app().textContent).toBe('lazy')
  })

  it('marks links as accessible links', () => {
    const router = createRouter({ initial: '/' })
    handle = render(() =>
      jsx(Link, { router, to: '/about' }, 'about link')
    )
    const link = app().querySelector('[role="link"]') as HTMLElement
    expect(link).not.toBeNull()
    expect(link.getAttribute('tabindex')).toBe('0')
  })
})

describe('history scroll restoration', () => {
  it('saves and restores scroll positions per path', async () => {
    window.history.replaceState({}, '', '/')
    const scrollTo = vi.fn()
    window.scrollTo = scrollTo
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 120,
    })
    const router = createRouter({ initial: '/', history: true })
    router.navigate('/about')
    await Promise.resolve()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 300,
    })
    router.navigate('/')
    await Promise.resolve()
    expect(scrollTo).toHaveBeenLastCalledWith(0, 120)
    router.dispose()
  })
})
