// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
    const text = Array.from(app().querySelectorAll<HTMLElement>('[data-tardis]'))
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
