// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  Boundary,
  createEffect,
  createSignal,
  dispatchEvent,
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

describe('Boundary effect errors', () => {
  it('routes later effect failures to the fallback', () => {
    const [boom, setBoom] = createSignal(false)
    handle = render(() =>
      jsx(Boundary, {
        content: () => {
          createEffect(() => {
            if (boom()) throw new Error('effect boom')
          })
          return jsx('p', {}, 'ok')
        },
      })
    )
    flushNow()
    expect(app().textContent).toContain('ok')
    setBoom(true)
    flushNow()
    expect(app().textContent).toContain('Something went wrong: effect boom')
  })
})

describe('ScrollView thumb', () => {
  it('drags the thumb to scroll proportionally', () => {
    handle = render(() =>
      jsx(ScrollView, {
        height: 100,
        contentHeight: 400,
        children: [jsx('div', { style: { height: 400 } }, 'content')],
      })
    )
    flushNow()
    const scroller = app().querySelector<HTMLElement>(
      '[data-tardis][style*="overflow: hidden"]'
    )!
    const inner = scroller.querySelector<HTMLElement>(
      '[data-tardis][style*="position: absolute"]'
    )!
    const thumb = scroller.querySelector<HTMLElement>('[role="scrollbar"]')!
    expect(thumb.getAttribute('aria-valuemax')).toBe('300')

    const id = Number(thumb.getAttribute('data-tardis'))
    dispatchEvent({ type: 'pointer', phase: 'down', node: id, x: 0, y: 20 })
    dispatchEvent({ type: 'pointer', phase: 'move', node: id, x: 0, y: 70 })
    dispatchEvent({ type: 'pointer', phase: 'up', node: id, x: 0, y: 70 })
    flushNow()
    expect(inner.style.top).toBe('-200px')
    expect(thumb.getAttribute('aria-valuenow')).toBe('200')
  })
})
