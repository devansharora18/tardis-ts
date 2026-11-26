// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  createSignal,
  dynamic,
  flushNow,
  jsx,
  render,
  type RenderHandle,
} from '../../src/scene/index'
import { installDevtools, type DevtoolsHandle } from '../../src/devtools/index'

let host: WebHost | null = null
let handle: RenderHandle | null = null
let devtools: DevtoolsHandle | null = null

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  host = createWebHost({ container: document.getElementById('app')! })
})

afterEach(() => {
  devtools?.dispose()
  devtools = null
  handle?.dispose()
  handle = null
  host?.dispose()
  host = null
  document.body.innerHTML = ''
})

describe('devtools', () => {
  it('renders the scene tree and toggles the panel', () => {
    handle = render(() =>
      jsx(
        'div',
        {},
        jsx('button', { ariaLabel: 'Save' }, 'Save'),
        jsx('p', {}, 'Body')
      )
    )
    devtools = installDevtools({ startOpen: true })
    expect(devtools.panel.style.display).toBe('block')
    expect(devtools.panel.textContent).toContain('button')
    expect(devtools.panel.textContent).toContain('text #2')
    expect(devtools.panel.textContent).toContain('"Body"')
    expect(devtools.element.getAttribute('aria-expanded')).toBe('true')

    devtools.element.click()
    expect(devtools.panel.style.display).toBe('none')
    expect(devtools.element.getAttribute('aria-expanded')).toBe('false')
  })

  it('records patches as the scene updates', () => {
    const [count, setCount] = createSignal(0)
    handle = render(() =>
      jsx('p', {}, 'Count: ', dynamic(() => String(count())))
    )
    devtools = installDevtools({ startOpen: true })
    setCount(1)
    flushNow()
    expect(devtools.panel.textContent).toContain('1 frames')
    expect(devtools.panel.textContent).toMatch(/#\d+ text/)

    setCount(2)
    flushNow()
    expect(devtools.panel.textContent).toContain('2 frames')
    expect(devtools.panel.textContent).toContain('Count: 2')
    expect(devtools.panel.textContent).toMatch(/#\d+ text/)
  })
})
