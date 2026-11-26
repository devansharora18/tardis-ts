// Browser host: applies the scene patch stream to the DOM.
//
// Native uses taffy/text raster; the web uses CSS flex and the browser's text
// engine. The patch op set is identical — only this adapter differs.

import { dispatchEvent, focusNode, getFocusedNode } from '../scene/render'
import type { HostOp, Patch } from '../scene/types'

export interface WebHostOptions {
  container?: HTMLElement
  force?: boolean
  background?: string
  color?: string
  /** Reuse server-rendered `[data-tardis]` nodes in place. */
  adopt?: boolean
}

import { BASE_CSS, CSS_PROPERTIES, defaultStyle, rootStyle, toCssValue } from './style'
import { semanticTag } from './tags'

// Keeps CSS width/padding semantics aligned with taffy's border-box sizing.
function ensureBaseStyles(doc: Document): void {
  const id = 'tardis-web-base'
  if (doc.getElementById(id)) return
  const style = doc.createElement('style')
  style.id = id
  style.textContent = BASE_CSS
  doc.head.appendChild(style)
}

export class WebHost {
  private container: HTMLElement
  private readonly root: HTMLElement
  private readonly elements = new Map<number, HTMLElement>()
  private readonly listeners: Array<{
    target: EventTarget
    type: string
    fn: (event: Event) => void
  }> = []
  private readonly flushFn: (json: string) => void
  private ime: HTMLTextAreaElement | null = null
  private composing = false
  private adopting = false
  private adoptQueue: HTMLElement[] = []
  private disposed = false

  constructor(options: WebHostOptions = {}) {
    if (typeof document === 'undefined') {
      throw new Error('tardis: the web host needs a DOM')
    }
    const doc = document
    ensureBaseStyles(doc)
    this.container = options.container ?? doc.getElementById('app') ?? doc.body
    const existing = options.adopt
      ? (this.container.querySelector('[data-tardis="0"]') as HTMLElement | null)
      : null
    if (existing) {
      this.root = existing
      this.adopting = true
      this.elements.set(0, existing)
      this.adoptQueue = Array.from(
        existing.querySelectorAll<HTMLElement>('[data-tardis]')
      )
    } else {
      this.root = doc.createElement('div')
      this.root.setAttribute('data-tardis', '0')
      for (const [key, value] of Object.entries(
        rootStyle(options.background, options.color)
      )) {
        this.applyStyle(this.root, key, value)
      }
      this.container.appendChild(this.root)
      this.elements.set(0, this.root)
    }

    this.flushFn = (json: string): void => this.flush(json)
    ;(globalThis as unknown as Record<string, unknown>)['__tardis_flush'] =
      this.flushFn
    this.installEvents()
  }

  private installEvents(): void {
    const handler = (phase: 'down' | 'up') => (event: Event): void => {
      const target = event.target as Element | null
      const element = target?.closest?.('[data-tardis]') as HTMLElement | null
      const node = element ? Number(element.getAttribute('data-tardis')) : undefined
      const pointer = event as PointerEvent
      dispatchEvent({
        type: 'pointer',
        phase,
        node,
        x: pointer.clientX ?? 0,
        y: pointer.clientY ?? 0,
        button: pointer.button ?? 0,
      })
      this.syncIme()
    }
    const move = (event: Event): void => {
      const pointer = event as PointerEvent
      if (pointer.buttons === 0) return
      const target = event.target as Element | null
      const element = target?.closest?.('[data-tardis]') as HTMLElement | null
      const node = element ? Number(element.getAttribute('data-tardis')) : undefined
      dispatchEvent({
        type: 'pointer',
        phase: 'move',
        node,
        x: pointer.clientX ?? 0,
        y: pointer.clientY ?? 0,
        button: pointer.button ?? 0,
      })
    }
    this.container.addEventListener('pointermove', move)
    this.listeners.push({ target: this.container, type: 'pointermove', fn: move })

    for (const [type, phase] of [
      ['pointerdown', 'down'],
      ['pointerup', 'up'],
    ] as const) {
      const fn = handler(phase)
      this.container.addEventListener(type, fn)
      this.listeners.push({ target: this.container, type, fn })
    }

    const wheel = (event: Event): void => {
      const wheelEvent = event as WheelEvent
      const target = event.target as Element | null
      const element = target?.closest?.('[data-tardis]') as HTMLElement | null
      const node = element ? Number(element.getAttribute('data-tardis')) : undefined
      dispatchEvent({
        type: 'wheel',
        node,
        dx: wheelEvent.deltaX,
        dy: wheelEvent.deltaY,
      })
      wheelEvent.preventDefault()
    }
    this.container.addEventListener('wheel', wheel, { passive: false })
    this.listeners.push({ target: this.container, type: 'wheel', fn: wheel })

    const focusin = (event: Event): void => {
      const target = event.target as Element | null
      const element = target?.closest?.('[data-tardis]') as HTMLElement | null
      if (element) {
        focusNode(Number(element.getAttribute('data-tardis')))
        this.syncIme()
      }
    }
    this.container.addEventListener('focusin', focusin)
    this.listeners.push({ target: this.container, type: 'focusin', fn: focusin })

    for (const [type, phase] of [
      ['keydown', 'down'],
      ['keyup', 'up'],
    ] as const) {
      const key = (event: Event): void => {
        const keyboard = event as KeyboardEvent
        dispatchEvent({
          type: 'key',
          phase,
          key: keyboard.key,
          repeat: keyboard.repeat,
          composing: keyboard.isComposing,
          mods: {
            ctrl: keyboard.ctrlKey,
            shift: keyboard.shiftKey,
            alt: keyboard.altKey,
            meta: keyboard.metaKey,
          },
        })
        if (keyboard.key === 'Tab' && this.imeActive()) keyboard.preventDefault()
        this.syncIme()
      }
      window.addEventListener(type, key)
      this.listeners.push({ target: window, type, fn: key })
    }
  }

  private imeActive(): boolean {
    return this.ime !== null && document.activeElement === this.ime
  }

  private ensureIme(): HTMLTextAreaElement {
    if (this.ime) return this.ime
    const textarea = document.createElement('textarea')
    textarea.setAttribute('aria-hidden', 'true')
    textarea.setAttribute('autocapitalize', 'off')
    textarea.setAttribute('autocomplete', 'off')
    textarea.setAttribute('autocorrect', 'off')
    textarea.spellcheck = false
    textarea.tabIndex = -1
    textarea.style.position = 'fixed'
    textarea.style.width = '1px'
    textarea.style.height = '1px'
    textarea.style.padding = '0'
    textarea.style.margin = '0'
    textarea.style.border = '0'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    textarea.style.fontSize = '16px'
    textarea.style.zIndex = '-1'
    textarea.addEventListener('compositionstart', (event) => {
      this.composing = true
      this.positionIme()
      dispatchEvent({
        type: 'text',
        composition: 'start',
        text: (event as CompositionEvent).data ?? '',
      })
    })
    textarea.addEventListener('compositionupdate', (event) => {
      dispatchEvent({
        type: 'text',
        composition: 'update',
        text: (event as CompositionEvent).data ?? '',
      })
    })
    textarea.addEventListener('compositionend', (event) => {
      this.composing = false
      textarea.value = ''
      dispatchEvent({
        type: 'text',
        composition: 'end',
        text: (event as CompositionEvent).data ?? '',
      })
    })
    textarea.addEventListener('input', () => {
      if (!this.composing) textarea.value = ''
    })
    document.body.appendChild(textarea)
    this.ime = textarea
    return textarea
  }

  private positionIme(): void {
    if (!this.ime) return
    const id = getFocusedNode()
    const element = id === null ? null : this.elements.get(id)
    const field = element?.closest?.('[role="textbox"]') as HTMLElement | null
    if (!field) return
    const rect = field.getBoundingClientRect()
    this.ime.style.left = `${rect.left}px`
    this.ime.style.top = `${rect.top + Math.max(0, rect.height / 2 - 8)}px`
  }

  /** Focus the hidden editable only while a scene text field is focused. */
  private syncIme(): void {
    const id = getFocusedNode()
    const element = id === null ? null : this.elements.get(id)
    const field = element?.closest?.('[role="textbox"]') as HTMLElement | null
    if (!field) {
      if (this.ime && document.activeElement === this.ime) this.ime.blur()
      return
    }
    const textarea = this.ensureIme()
    this.positionIme()
    if (document.activeElement !== textarea) {
      textarea.focus({ preventScroll: true })
    }
  }

  flush(json: string): void {
    if (this.disposed) return
    const patch = JSON.parse(json) as Patch
    for (const op of patch.ops) this.apply(op)
    if (this.adopting) {
      this.adopting = false
      this.removeUnclaimed()
    }
  }

  /** Drop server nodes the client patch stream did not claim. */
  private removeUnclaimed(): void {
    const claimed = new Set(this.elements.values())
    for (const element of Array.from(
      this.root.querySelectorAll<HTMLElement>('[data-tardis]')
    )) {
      if (!claimed.has(element)) element.remove()
    }
    this.adoptQueue.length = 0
  }

  private apply(op: HostOp): void {
    switch (op.op) {
      case 'create': {
        const parent = this.elements.get(op.parent)
        if (!parent) {
          console.warn(`tardis web: missing parent ${op.parent}`)
          return
        }
        const reused = this.elements.get(op.id)
        if (reused) {
          const reference = parent.children.item(op.index) ?? null
          if (reference !== reused) parent.insertBefore(reused, reference)
          break
        }
        if (this.adoptQueue.length > 0) {
          const at = this.adoptQueue.findIndex(
            (candidate) => candidate.parentElement === parent
          )
          if (at !== -1) {
            const adopted = this.adoptQueue.splice(at, 1)[0]!
            adopted.setAttribute('data-tardis', String(op.id))
            const reference = parent.children.item(op.index) ?? null
            if (reference !== adopted) parent.insertBefore(adopted, reference)
            this.elements.set(op.id, adopted)
            break
          }
        }
        const element = this.createElement(op.kind, op.tag)
        element.setAttribute('data-tardis', String(op.id))
        const reference = parent.children.item(op.index) ?? null
        parent.insertBefore(element, reference)
        this.elements.set(op.id, element)
        break
      }
      case 'focus': {
        return
      }
      case 'destroy': {
        const element = this.elements.get(op.id)
        if (!element) return
        const ids = [
          op.id,
          ...Array.from(element.querySelectorAll('[data-tardis]')).map((child) =>
            Number(child.getAttribute('data-tardis'))
          ),
        ]
        element.remove()
        for (const id of ids) this.elements.delete(id)
        break
      }
      case 'insert': {
        const element = this.elements.get(op.id)
        const parent = this.elements.get(op.parent)
        if (!element || !parent || element === parent) return
        const reference = parent.children.item(op.index) ?? null
        parent.insertBefore(element, reference)
        break
      }
      case 'style': {
        const element = this.elements.get(op.id)
        if (!element) return
        for (const [key, value] of Object.entries(op.props)) {
          this.applyStyle(element, key, value)
        }
        break
      }
      case 'a11y': {
        const element = this.elements.get(op.id)
        if (!element) return
        for (const [key, value] of Object.entries(op.props)) {
          const attribute = key === 'tabIndex' ? 'tabindex' : key
          if (value === null || value === undefined) {
            element.removeAttribute(attribute)
          } else {
            element.setAttribute(attribute, String(value))
          }
        }
        break
      }
      case 'text': {
        const element = this.elements.get(op.id)
        if (element) element.textContent = op.value
        break
      }
      case 'image': {
        const element = this.elements.get(op.id)
        if (element instanceof HTMLImageElement) {
          element.src = op.src
          element.style.objectFit = op.fit || 'cover'
        }
        break
      }
      case 'scroll': {
        const element = this.elements.get(op.id)
        if (element) {
          element.scrollLeft = op.x
          element.scrollTop = op.y
        }
        break
      }
    }
  }

  private createElement(kind: string, tag = ''): HTMLElement {
    const semantic = semanticTag(kind, tag)
    const element = document.createElement(semantic) as HTMLElement
    for (const [key, value] of Object.entries(defaultStyle(kind, tag))) {
      this.applyStyle(element, key, value)
    }
    if (semantic === 'button') {
      ;(element as HTMLButtonElement).type = 'button'
    }
    return element
  }

  private applyStyle(element: HTMLElement, key: string, value: unknown): void {
    const property = CSS_PROPERTIES[key]
    if (!property) return
    if (value === null || value === undefined) {
      element.style.removeProperty(property)
      return
    }
    const css = toCssValue(key, value)
    if (css !== null) element.style.setProperty(property, css)
  }

  getRootElement(): HTMLElement {
    return this.root
  }

  /** Move the host to another container, replacing its children. */
  setContainer(container: HTMLElement, replace = false): void {
    this.detachEvents()
    this.container = container
    if (replace) container.replaceChildren(this.root)
    else container.appendChild(this.root)
    this.installEvents()
  }

  private detachEvents(): void {
    for (const listener of this.listeners) {
      listener.target.removeEventListener(listener.type, listener.fn)
    }
    this.listeners.length = 0
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.detachEvents()
    const g = globalThis as unknown as Record<string, unknown>
    if (g['__tardis_flush'] === this.flushFn) delete g['__tardis_flush']
    if (currentHost === this) currentHost = null
    this.root.remove()
    this.ime?.remove()
    this.ime = null
    this.elements.clear()
  }
}

let currentHost: WebHost | null = null

export function createWebHost(options: WebHostOptions = {}): WebHost {
  currentHost?.dispose()
  currentHost = new WebHost(options)
  return currentHost
}

export function installWebHost(options: WebHostOptions = {}): WebHost | null {
  if (typeof document === 'undefined') return null
  if (currentHost && !options.force) return currentHost
  const g = globalThis as unknown as Record<string, unknown>
  if (!options.force && typeof g['__tardis_flush'] === 'function') return null
  currentHost?.dispose()
  currentHost = new WebHost(options)
  return currentHost
}

export function getWebHost(): WebHost | null {
  return currentHost
}
