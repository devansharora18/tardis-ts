// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  createSignal,
  dynamic,
  flushNow,
  Fragment,
  jsx,
  render,
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

function mount(factory: () => unknown): HTMLElement {
  handle = render(factory)
  flushNow()
  return document.getElementById('app')!
}

function byText(root: ParentNode, text: string): HTMLElement {
  const found = Array.from(root.querySelectorAll<HTMLElement>('[data-tardis]')).find(
    (element) => element.textContent === text && element.children.length === 0
  )
  if (!found) throw new Error(`no element with text ${text}`)
  return found
}

function click(element: Element): void {
  element.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }))
  element.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true }))
}

describe('web host', () => {
  it('renders text and maps style objects to CSS', () => {
    const app = mount(() =>
      jsx(
        'div',
        { style: { padding: 12, backgroundColor: '#ff0000', borderRadius: 8 } },
        jsx('h1', {}, 'Hello')
      )
    )
    const heading = byText(app, 'Hello')
    expect(heading.style.fontSize).toBe('32px')
    expect(heading.style.lineHeight).toBe('38px')
    const card = heading.parentElement as HTMLElement
    expect(card.style.padding).toBe('12px')
    expect(card.style.backgroundColor).toBe('rgb(255, 0, 0)')
    expect(card.style.borderRadius).toBe('8px')
    expect(card.style.display).toBe('flex')
  })

  it('maps text overflow and nowrap to CSS', () => {
    const app = mount(() =>
      jsx(
        'span',
        {
          style: {
            width: 80,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          },
        },
        'A long label'
      )
    )
    const label = byText(app, 'A long label')
    expect(label.style.textOverflow).toBe('ellipsis')
    expect(label.style.whiteSpace).toBe('nowrap')
    expect(label.style.overflow).toBe('hidden')
  })

  it('updates dynamic text in place', () => {
    const [count, setCount] = createSignal(0)
    const app = mount(() => jsx('h1', {}, 'Count: ', dynamic(() => count())))
    expect(app.textContent).toBe('Count: 0')
    setCount(3)
    flushNow()
    expect(app.textContent).toBe('Count: 3')
  })

  it('clicks bubble from the text node to the button view', () => {
    const [count, setCount] = createSignal(0)
    const app = mount(() =>
      jsx(
        'div',
        {},
        jsx('button', { onClick: () => setCount((n) => n + 1) }, 'go'),
        jsx('p', {}, 'Count: ', dynamic(() => count()))
      )
    )
    expect(app.textContent).toContain('Count: 0')
    click(byText(app, 'go'))
    flushNow()
    expect(app.textContent).toContain('Count: 1')
  })

  it('unmounts conditional branches', () => {
    const [on, setOn] = createSignal(true)
    const app = mount(() =>
      jsx('div', {}, dynamic(() => (on() ? jsx('p', {}, 'shown') : null)))
    )
    expect(app.textContent).toContain('shown')
    setOn(false)
    flushNow()
    expect(app.textContent).not.toContain('shown')
  })

  it('renders fragments as display contents', () => {
    const app = mount(() =>
      jsx(Fragment, {}, jsx('div', {}, 'a'), jsx('div', {}, 'b'))
    )
    const fragment = app.querySelector<HTMLElement>(
      '[data-tardis][style*="display: contents"]'
    )
    expect(fragment).not.toBeNull()
    expect(fragment!.children).toHaveLength(2)
    expect(app.textContent).toBe('ab')
  })

  it('ignores unknown style keys', () => {
    const app = mount(() =>
      jsx('div', { style: { boxShadow: '0 0 1px red', padding: 4 } }, 'x')
    )
    const element = byText(app, 'x') as HTMLElement
    expect(element.style.boxShadow).toBe('')
    expect(element.parentElement!.style.padding).toBe('4px')
  })

  it('removes the root on dispose', () => {
    const app = mount(() => jsx('div', {}, 'bye'))
    expect(app.textContent).toContain('bye')
    handle!.dispose()
    handle = null
    expect(app.textContent).toBe('')
  })
})
