// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  createSignal,
  flushNow,
  focusNode,
  jsx,
  readClipboard,
  render,
  TextField,
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

function key(value: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: value, bubbles: true, ...init })
  )
  flushNow()
}

function fieldElement(): HTMLElement {
  return app().querySelector<HTMLElement>('[role="textbox"]')!
}

function focusField(): void {
  focusNode(Number(fieldElement().getAttribute('data-tardis')))
}

function type(text: string): void {
  for (const char of text) key(char)
}

describe('TextField selection', () => {
  it('selects with shift+arrows and collapses on plain movement', () => {
    const [value, setValue] = createSignal('abcd')
    handle = render(() =>
      jsx(TextField, { value: () => value(), onChange: setValue })
    )
    focusField()
    key('End')
    key('ArrowLeft', { shiftKey: true })
    key('ArrowLeft', { shiftKey: true })
    expect(fieldElement().querySelector('span[style*="background"]')).not.toBeNull()

    key('ArrowLeft')
    type('X')
    expect(value()).toBe('abXcd')
  })

  it('replaces the whole value after ctrl+a and typing', () => {
    const [value, setValue] = createSignal('old')
    handle = render(() =>
      jsx(TextField, { value: () => value(), onChange: setValue })
    )
    focusField()
    key('a', { ctrlKey: true })
    type('new')
    expect(value()).toBe('new')
  })

  it('cuts and copies only the selection', () => {
    const [value, setValue] = createSignal('hello world')
    handle = render(() =>
      jsx(TextField, { value: () => value(), onChange: setValue })
    )
    focusField()
    key('End')
    for (let index = 0; index < 5; index += 1) key('ArrowLeft', { shiftKey: true })
    key('c', { ctrlKey: true })
    expect(readClipboard()).toBe('world')

    key('x', { ctrlKey: true })
    expect(value()).toBe('hello ')
    expect(readClipboard()).toBe('world')
  })

  it('deletes a selection with backspace', () => {
    const [value, setValue] = createSignal('abcdef')
    handle = render(() =>
      jsx(TextField, { value: () => value(), onChange: setValue })
    )
    focusField()
    key('End')
    key('Home', { shiftKey: true })
    key('Backspace')
    expect(value()).toBe('')
  })

  it('moves by word with alt+arrow', () => {
    const [value, setValue] = createSignal('one two three')
    handle = render(() =>
      jsx(TextField, { value: () => value(), onChange: setValue })
    )
    focusField()
    key('End')
    key('ArrowLeft', { altKey: true })
    expect(value()).toBe('one two three')
    type('|')
    expect(value()).toBe('one two |three')
    key('ArrowLeft', { altKey: true })
    key('ArrowLeft', { altKey: true })
    type('|')
    expect(value()).toBe('one |two |three')
  })
})

describe('TextField multiline', () => {
  it('inserts newlines and exposes aria-multiline', () => {
    const [value, setValue] = createSignal('')
    handle = render(() =>
      jsx(TextField, {
        value: () => value(),
        onChange: setValue,
        multiline: true,
        ariaLabel: 'Notes',
      })
    )
    expect(fieldElement().getAttribute('aria-multiline')).toBe('true')
    focusField()
    type('ab')
    key('Enter')
    type('cd')
    expect(value()).toBe('ab\ncd')
    expect(app().textContent).toContain('ab')
    expect(app().textContent).toContain('cd')
  })

  it('moves vertically keeping the column', () => {
    const [value, setValue] = createSignal('abc\nde')
    handle = render(() =>
      jsx(TextField, {
        value: () => value(),
        onChange: setValue,
        multiline: true,
      })
    )
    focusField()
    key('ArrowDown')
    key('End')
    key('ArrowUp')
    type('X')
    expect(value()).toBe('abXc\nde')
    key('ArrowDown')
    type('Y')
    expect(value()).toBe('abXc\ndeY')
  })

  it('home and end act on the caret line', () => {
    const [value, setValue] = createSignal('abc\ndef')
    handle = render(() =>
      jsx(TextField, { value: () => value(), onChange: setValue, multiline: true })
    )
    focusField()
    key('Home')
    type('X')
    expect(value()).toBe('Xabc\ndef')
    key('ArrowDown')
    key('End')
    type('Y')
    expect(value()).toBe('Xabc\ndefY')
    key('Home')
    type('Z')
    expect(value()).toBe('Xabc\nZdefY')
  })

  it('submits on ctrl+enter but not plain enter', () => {
    const onSubmit = vi.fn()
    handle = render(() =>
      jsx(TextField, { multiline: true, onSubmit })
    )
    focusField()
    key('Enter')
    expect(onSubmit).not.toHaveBeenCalled()
    key('Enter', { ctrlKey: true })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('keeps a minimum row height', () => {
    handle = render(() => jsx(TextField, { multiline: true, rows: 3 }))
    const field = fieldElement()
    expect(field.style.minHeight).toBe(`${3 * 22 + 16}px`)
  })
})
