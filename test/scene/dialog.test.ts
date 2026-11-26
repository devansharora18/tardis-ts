// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  createSignal,
  Dialog,
  flushNow,
  focusNode,
  getFocusedNode,
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

function app(): HTMLElement {
  return document.getElementById('app')!
}

function key(value: string): void {
  window.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: value, bubbles: true })
  )
  flushNow()
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  flushNow()
}

describe('Dialog', () => {
  it('traps tab focus and restores it on close', async () => {
    const [open, setOpen] = createSignal(false)
    const onClose = vi.fn(() => setOpen(false))
    handle = render(() =>
      jsx(
        'div',
        {},
        jsx('button', { onClick: () => setOpen(true) }, 'Open'),
        jsx(
          Dialog,
          { open: () => open(), onClose, title: 'Settings' },
          jsx('button', {}, 'OK'),
          jsx('button', {}, 'Cancel')
        )
      )
    )
    const buttons = app().querySelectorAll<HTMLElement>('button')
    const trigger = buttons[0]!
    const ok = buttons[1]!
    const cancel = buttons[2]!
    focusNode(Number(trigger.getAttribute('data-tardis-ts')))

    setOpen(true)
    await settle()
    expect(getFocusedNode()).toBe(Number(ok.getAttribute('data-tardis-ts')))

    key('Tab')
    expect(getFocusedNode()).toBe(Number(cancel.getAttribute('data-tardis-ts')))
    key('Tab')
    expect(getFocusedNode()).toBe(Number(ok.getAttribute('data-tardis-ts')))
    key('Escape')
    expect(onClose).toHaveBeenCalledTimes(1)
    await settle()
    expect(open()).toBe(false)
    expect(getFocusedNode()).toBe(Number(trigger.getAttribute('data-tardis-ts')))
  })

  it('renders modal semantics and hides when closed', async () => {
    const [open, setOpen] = createSignal(true)
    handle = render(() =>
      jsx(Dialog, { open: () => open(), onClose: () => setOpen(false) }, 'Body')
    )
    await settle()
    const dialog = app().querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    const overlay = dialog?.parentElement as HTMLElement
    expect(overlay.style.display).toBe('flex')
    setOpen(false)
    flushNow()
    expect(overlay.style.display).toBe('none')
  })
})
