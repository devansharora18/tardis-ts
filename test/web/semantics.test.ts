// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  Checkbox,
  createSignal,
  dynamic,
  flushNow,
  focusNode,
  jsx,
  render,
  TextField,
  readClipboard,
  writeClipboard,
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

function leaf(text: string): HTMLElement {
  const found = Array.from(app().querySelectorAll<HTMLElement>('[data-tardis]'))
    .filter((element) => element.children.length === 0)
    .find((element) => element.textContent === text)
  if (!found) throw new Error(`no element ${text}`)
  return found
}

function click(element: Element): void {
  element.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }))
  element.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true }))
}

function key(value: string, mods: Partial<KeyboardEventInit> = {}): void {
  window.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: value, bubbles: true, ...mods })
  )
}

describe('semantic elements and a11y', () => {
  it('renders real heading, paragraph, and button elements', () => {
    handle = render(() =>
      jsx(
        'div',
        {},
        jsx('h1', {}, 'Title'),
        jsx('p', {}, 'Body'),
        jsx('button', { onClick: () => {} }, 'Go')
      )
    )
    expect(app().querySelector('h1')?.textContent).toBe('Title')
    expect(app().querySelector('p')?.textContent).toBe('Body')
    expect(app().querySelector('button')?.textContent).toBe('Go')
  })

  it('applies role, aria, and tabindex attributes', () => {
    handle = render(() =>
      jsx(
        'div',
        { role: 'textbox', 'aria-label': 'Name', tabIndex: 0 },
        'x'
      )
    )
    const field = app().querySelector<HTMLElement>('[role="textbox"]')!
    expect(field.getAttribute('aria-label')).toBe('Name')
    expect(field.getAttribute('tabindex')).toBe('0')
  })
})

describe('focus and pointer events', () => {
  it('fires pointer, focus, blur, and pointer-up handlers in order', () => {
    const log: string[] = []
    const make = (name: string) =>
      jsx(
        'div',
        {
          onFocus: () => log.push(`focus-${name}`),
          onBlur: () => log.push(`blur-${name}`),
          onPointerDown: () => log.push(`down-${name}`),
          onPointerUp: () => log.push(`up-${name}`),
        },
        name
      )
    const first = make('a')
    const second = make('b')
    handle = render(() => jsx('div', {}, first, second))

    click(leaf('a'))
    click(leaf('b'))
    expect(log).toEqual([
      'focus-a',
      'down-a',
      'up-a',
      'blur-a',
      'focus-b',
      'down-b',
      'up-b',
    ])
  })
})

describe('TextField', () => {
  it('types, edits, and calls onSubmit', () => {
    const [value, setValue] = createSignal('')
    const submit = vi.fn()
    handle = render(() =>
      jsx(TextField, {
        value: () => value(),
        onChange: setValue,
        placeholder: 'Type here',
        ariaLabel: 'Name',
        onSubmit: submit,
      })
    )
    const field = app().querySelector<HTMLElement>('[role="textbox"]')!
    expect(field.tagName).toBe('DIV')
    expect(field.getAttribute('aria-label')).toBe('Name')
    expect(app().textContent).toContain('Type here')

    focusNode(Number(field.getAttribute('data-tardis')))
    key('H')
    key('i')
    expect(value()).toBe('Hi')
    expect(app().textContent).toContain('Hi')

    key('Backspace')
    expect(value()).toBe('H')
    key('ArrowLeft')
    key('x')
    expect(value()).toBe('xH')

    key('Enter')
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('copies and pastes through the clipboard bridge', () => {
    const [value, setValue] = createSignal('abc')
    handle = render(() =>
      jsx(TextField, { value: () => value(), onChange: setValue })
    )
    const field = app().querySelector<HTMLElement>('[role="textbox"]')!
    focusNode(Number(field.getAttribute('data-tardis')))

    key('a', { ctrlKey: true })
    key('c', { ctrlKey: true })
    setValue('')
    flushNow()
    key('v', { ctrlKey: true })
    expect(value()).toBe('abc')
  })

  it('supports an uncontrolled value', () => {
    handle = render(() => jsx(TextField, { placeholder: 'Free' }))
    const field = app().querySelector<HTMLElement>('[role="textbox"]')!
    focusNode(Number(field.getAttribute('data-tardis')))
    key('a')
    expect(app().textContent).toContain('a')
  })
})

describe('Checkbox', () => {
  it('toggles and exposes aria-checked', () => {
    const [checked, setChecked] = createSignal(false)
    handle = render(() =>
      jsx(
        'div',
        {},
        jsx(Checkbox, {
          checked: () => checked(),
          onChange: setChecked,
          label: 'Subscribe',
        }),
        jsx('p', {}, 'State: ', dynamic(() => (checked() ? 'on' : 'off')))
      )
    )
    const box = app().querySelector<HTMLElement>('[role="checkbox"]')!
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(app().textContent).toContain('State: off')

    click(leaf('Subscribe'))
    expect(checked()).toBe(true)
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(app().textContent).toContain('State: on')
  })
})

describe('clipboard bridge', () => {
  it('keeps a usable in-memory buffer', () => {
    writeClipboard('hello')
    expect(readClipboard()).toBe('hello')
  })
})
