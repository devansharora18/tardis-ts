// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSignal, dynamic, jsx } from '../../src/scene/index'
import { hydrate, renderToString } from '../../src/ssr/index'
import type { HydratedApp } from '../../src/ssr/index'

let hydrated: HydratedApp | null = null

afterEach(() => {
  hydrated?.dispose()
  hydrated = null
  document.body.innerHTML = ''
})

function click(element: Element): void {
  element.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }))
  element.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true }))
}

const App = () => {
  const [count, setCount] = createSignal(0)
  return jsx(
    'div',
    {},
    jsx('button', { onClick: () => setCount((value) => value + 1) }, '+'),
    jsx('p', {}, 'Count: ', dynamic(() => count()))
  )
}

describe('hydrate', () => {
  it('takes over server markup and keeps bindings live', () => {
    const server = renderToString(App)
    document.body.innerHTML = `<div id="app">${server}</div>`
    const container = document.getElementById('app')!
    const serverButton = container.querySelector('button')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      hydrated = hydrate(App, container)
      expect(warn).not.toHaveBeenCalled()
      expect(container.querySelector('button')).toBe(serverButton)
      expect(container.textContent).toContain('Count: 0')
      const plus = Array.from(
        container.querySelectorAll<HTMLElement>('[data-tardis-ts]')
      ).find(
        (element) =>
          element.textContent === '+' && element.children.length === 0
      )
      expect(plus).toBeDefined()
      click(plus!)
      expect(container.textContent).toContain('Count: 1')
    } finally {
      warn.mockRestore()
    }
  })

  it('warns and replaces stale server markup', () => {
    document.body.innerHTML = '<div id="app"><p>stale</p></div>'
    const container = document.getElementById('app')!
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      hydrated = hydrate(App, container)
      expect(warn).toHaveBeenCalled()
      expect(container.textContent).toContain('Count: 0')
      expect(container.textContent).not.toContain('stale')
    } finally {
      warn.mockRestore()
    }
  })
})
