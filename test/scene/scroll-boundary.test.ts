// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  Boundary,
  createSignal,
  flushNow,
  jsx,
  render,
  ScrollView,
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

describe('ScrollView', () => {
  it('scrolls the inner view and clamps at the content end', () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      jsx('div', { style: { height: 40 } }, `Row ${index}`)
    )
    handle = render(() =>
      jsx(ScrollView, {
        height: 100,
        contentHeight: 400,
        children: rows,
      })
    )
    flushNow()
    const scroller = app().querySelector<HTMLElement>(
      '[data-tardis][style*="overflow: hidden"]'
    )!
    const inner = scroller.querySelector<HTMLElement>(
      '[data-tardis][style*="position: absolute"]'
    )!
    expect(inner.style.top).toBe('0px')

    scroller.dispatchEvent(
      new window.WheelEvent('wheel', { bubbles: true, deltaY: 150 })
    )
    flushNow()
    expect(inner.style.top).toBe('-150px')

    scroller.dispatchEvent(
      new window.WheelEvent('wheel', { bubbles: true, deltaY: 10_000 })
    )
    flushNow()
    expect(inner.style.top).toBe('-300px')
  })

  it('supports controlled scroll offsets', () => {
    const [offset, setOffset] = createSignal(0)
    handle = render(() =>
      jsx(ScrollView, {
        height: 100,
        contentHeight: 400,
        scrollTop: () => offset(),
        onScroll: setOffset,
        children: [jsx('div', { style: { height: 400 } }, 'content')],
      })
    )
    flushNow()
    const scroller = app().querySelector<HTMLElement>(
      '[data-tardis][style*="overflow: hidden"]'
    )!
    scroller.dispatchEvent(
      new window.WheelEvent('wheel', { bubbles: true, deltaY: 100 })
    )
    flushNow()
    expect(offset()).toBe(100)
  })
})

describe('Boundary', () => {
  it('renders a fallback when content throws', () => {
    const onError = vi.fn()
    handle = render(() =>
      jsx(Boundary, {
        content: () => {
          throw new Error('boom')
        },
        onError,
      })
    )
    flushNow()
    expect(app().textContent).toContain('Something went wrong: boom')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('can reset and render successful content', () => {
    let shouldThrow = true
    handle = render(() =>
      jsx(Boundary, {
        content: () => {
          if (shouldThrow) throw new Error('temporary')
          return jsx('p', {}, 'recovered')
        },
        fallback: (error, reset) =>
          jsx('button', { onClick: reset }, `Retry (${error.message})`),
      })
    )
    flushNow()
    const retry = app().querySelector('button')!
    expect(retry.textContent).toContain('Retry')
    shouldThrow = false
    retry.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }))
    retry.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true }))
    flushNow()
    expect(app().textContent).toContain('recovered')
  })
})
