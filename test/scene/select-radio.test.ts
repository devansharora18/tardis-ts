// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  createSignal,
  flushNow,
  focusNode,
  jsx,
  RadioGroup,
  render,
  Select,
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
  flushNow()
}

function key(value: string): void {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true }))
  flushNow()
}

const fruits = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
]

describe('Select', () => {
  it('opens, selects, and closes', () => {
    const [value, setValue] = createSignal('a')
    handle = render(() =>
      jsx(Select, {
        value: () => value(),
        options: fruits,
        onChange: setValue,
        ariaLabel: 'Fruit',
      })
    )
    const combobox = app().querySelector<HTMLElement>('[role="combobox"]')!
    expect(combobox.textContent).toContain('Apple')
    click(combobox)
    expect(combobox.getAttribute('aria-expanded')).toBe('true')
    const options = app().querySelectorAll<HTMLElement>('[role="option"]')
    expect(options).toHaveLength(3)
    expect(options[0].getAttribute('aria-selected')).toBe('true')

    click(options[1])
    expect(value()).toBe('b')
    expect(combobox.textContent).toContain('Banana')
    expect(combobox.getAttribute('aria-expanded')).toBe('false')
    expect(app().querySelector('[role="listbox"]')).toBeNull()
  })

  it('supports arrow navigation and enter', () => {
    const [value, setValue] = createSignal('a')
    handle = render(() =>
      jsx(Select, { value: () => value(), options: fruits, onChange: setValue })
    )
    const combobox = app().querySelector<HTMLElement>('[role="combobox"]')!
    focusNode(Number(combobox.getAttribute('data-tardis')))
    key('Enter')
    expect(combobox.getAttribute('aria-expanded')).toBe('true')
    key('ArrowDown')
    key('Enter')
    expect(value()).toBe('b')
  })

  it('does not select disabled options', () => {
    const [value, setValue] = createSignal('a')
    handle = render(() =>
      jsx(Select, { value: () => value(), options: fruits, onChange: setValue })
    )
    const combobox = app().querySelector<HTMLElement>('[role="combobox"]')!
    click(combobox)
    const options = app().querySelectorAll<HTMLElement>('[role="option"]')
    click(options[2])
    expect(value()).toBe('a')
  })
})

describe('RadioGroup', () => {
  it('selects by click and exposes aria-checked', () => {
    const [value, setValue] = createSignal('a')
    handle = render(() =>
      jsx(RadioGroup, {
        value: () => value(),
        options: fruits,
        onChange: setValue,
        ariaLabel: 'Fruit',
      })
    )
    const radios = app().querySelectorAll<HTMLElement>('[role="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
    expect(radios[0].getAttribute('tabindex')).toBe('0')
    expect(radios[1].getAttribute('tabindex')).toBe('-1')

    click(radios[1])
    expect(value()).toBe('b')
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
    expect(radios[1].getAttribute('tabindex')).toBe('0')
  })

  it('moves selection with arrow keys and skips disabled options', () => {
    const [value, setValue] = createSignal('a')
    handle = render(() =>
      jsx(RadioGroup, {
        value: () => value(),
        options: fruits,
        onChange: setValue,
      })
    )
    const radios = app().querySelectorAll<HTMLElement>('[role="radio"]')
    focusNode(Number(radios[0].getAttribute('data-tardis')))
    key('ArrowRight')
    expect(value()).toBe('b')
    key('ArrowRight')
    expect(value()).toBe('a')
    key('End')
    expect(value()).toBe('b')
    key('Home')
    expect(value()).toBe('a')
  })
})
