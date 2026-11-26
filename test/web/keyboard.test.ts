// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  flushNow,
  focusNode,
  jsx,
  render,
  type RenderHandle,
  type SceneEvent,
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

function leaf(text: string): HTMLElement {
  const found = Array.from(app().querySelectorAll<HTMLElement>('[data-tardis]'))
    .filter((element) => element.children.length === 0)
    .find((element) => element.textContent === text)
  if (!found) throw new Error(`no element ${text}`)
  return found
}

function key(key: string, phase: 'down' | 'up' = 'down'): void {
  window.dispatchEvent(
    new window.KeyboardEvent(`key${phase}`, { key, bubbles: true })
  )
}

describe('keyboard', () => {
  it('dispatches key events to the focused node and bubbles', () => {
    const seen: string[] = []
    let clicks = 0
    handle = render(() =>
      jsx(
        'div',
        { onKeyDown: (event: SceneEvent) => seen.push(String(event.key)) },
        jsx('button', { onClick: () => (clicks += 1) }, 'go')
      )
    )
    const text = leaf('go')
    focusNode(Number(text.getAttribute('data-tardis')))
    key('a')
    flushNow()
    expect(seen).toEqual(['a'])

    key('Enter')
    expect(clicks).toBe(1)
    expect(seen).toContain('Enter')
  })

  it('calls onKeyUp separately', () => {
    const up: string[] = []
    handle = render(() =>
      jsx('div', { onKeyUp: (event: SceneEvent) => up.push(String(event.key)) }, 'x')
    )
    focusNode(Number(leaf('x').getAttribute('data-tardis')))
    key('b', 'up')
    expect(up).toEqual(['b'])
  })

  it('sets focus on pointer down', () => {
    const seen: string[] = []
    handle = render(() =>
      jsx('div', { onKeyDown: (event: SceneEvent) => seen.push(String(event.key)) }, 'click me')
    )
    const text = leaf('click me')
    text.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }))
    key('c')
    expect(seen).toEqual(['c'])
  })
})
