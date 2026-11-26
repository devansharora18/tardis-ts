// Browser host: applies the scene patch stream to the DOM.
//
// Native uses taffy/text raster; the web uses CSS flex and the browser's text
// engine. The patch op set is identical — only this adapter differs.

import { dispatchEvent, focusNode } from '../scene/render'
import type { HostOp, Patch } from '../scene/types'

export interface WebHostOptions {
  container?: HTMLElement
  force?: boolean
  background?: string
  color?: string
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
  private disposed = false

  constructor(options: WebHostOptions = {}) {
    if (typeof document === 'undefined') {
      throw new Error('tardis: the web host needs a DOM')
    }
    const doc = document
    ensureBaseStyles(doc)
    this.container = options.container ?? doc.getElementById('app') ?? doc.body
    this.root = doc.createElement('div')
    this.root.setAttribute('data-tardis', '0')
    for (const [key, value] of Object.entries(
      rootStyle(options.background, options.color)
    )) {
      this.applyStyle(this.root, key, value)
    }
    this.container.appendChild(this.root)
    this.elements.set(0, this.root)

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
    }
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
          mods: {
            ctrl: keyboard.ctrlKey,
            shift: keyboard.shiftKey,
            alt: keyboard.altKey,
            meta: keyboard.metaKey,
          },
        })
      }
      window.addEventListener(type, key)
      this.listeners.push({ target: window, type, fn: key })
    }
  }

  flush(json: string): void {
    if (this.disposed) return
    const patch = JSON.parse(json) as Patch
    for (const op of patch.ops) this.apply(op)
  }

  private apply(op: HostOp): void {
    switch (op.op) {
      case 'create': {
        const parent = this.elements.get(op.parent)
        if (!parent) {
          console.warn(`tardis web: missing parent ${op.parent}`)
          return
        }
        const element = this.createElement(op.kind, op.tag)
        element.setAttribute('data-tardis', String(op.id))
        const reference = parent.children.item(op.index) ?? null
        parent.insertBefore(element, reference)
        this.elements.set(op.id, element)
        break
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
