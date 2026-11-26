// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  flushNow,
  jsx,
  render,
  VirtualList,
  type RenderHandle,
} from '../../src/scene/index'

const ITEMS = Array.from({ length: 10_000 }, (_, index) => `Row ${index}`)

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

function mount(): HTMLElement {
  handle = render(() =>
    jsx(
      'div',
      { style: { padding: 16 } },
      jsx(VirtualList, {
        items: () => ITEMS,
        rowHeight: 40,
        height: 400,
        renderRow: (item) => jsx('div', { style: { height: 40 } }, item),
      })
    )
  )
  flushNow()
  return document.getElementById('app')!
}

function rows(app: ParentNode): string[] {
  return Array.from(app.querySelectorAll<HTMLElement>('[data-tardis-ts]'))
    .filter((element) => element.children.length === 0)
    .map((element) => element.textContent ?? '')
    .filter((text) => text.startsWith('Row '))
}

describe('VirtualList', () => {
  it('mounts only the visible window of 10,000 rows', () => {
    const app = mount()
    const visible = rows(app)
    expect(visible.length).toBeGreaterThan(5)
    expect(visible.length).toBeLessThan(25)
    expect(visible).toContain('Row 0')
    expect(visible).not.toContain('Row 9999')
  })

  it('scrolls with wheel events and keeps the window small', () => {
    const app = mount()
    const list = app.querySelector<HTMLElement>('[data-tardis-ts][style*="overflow: hidden"]')
    expect(list).not.toBeNull()
    list!.dispatchEvent(
      new window.WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: 400,
      })
    )
    flushNow()
    const visible = rows(app)
    expect(visible.length).toBeLessThan(25)
    expect(visible).toContain('Row 8')
    expect(visible).not.toContain('Row 0')
    expect(visible).not.toContain('Row 9999')
  })

  it('clamps at the end of the list', () => {
    const app = mount()
    const list = app.querySelector<HTMLElement>('[data-tardis-ts][style*="overflow: hidden"]')
    list!.dispatchEvent(
      new window.WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: 10_000_000,
      })
    )
    flushNow()
    const visible = rows(app)
    expect(visible).toContain('Row 9999')
    expect(visible.length).toBeLessThan(25)
  })
})
