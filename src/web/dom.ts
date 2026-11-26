// Browser host: applies the scene patch stream to the DOM.
//
// Native uses taffy/text raster; the web uses CSS flex and the browser's text
// engine. The patch op set is identical — only this adapter differs.

import { dispatchEvent } from '../scene/render'
import type { HostOp, Patch } from '../scene/types'

export interface WebHostOptions {
  container?: HTMLElement
  force?: boolean
  background?: string
  color?: string
}

const CSS_PROPERTIES: Record<string, string> = {
  width: 'width',
  height: 'height',
  minWidth: 'min-width',
  maxWidth: 'max-width',
  minHeight: 'min-height',
  maxHeight: 'max-height',
  padding: 'padding',
  paddingTop: 'padding-top',
  paddingRight: 'padding-right',
  paddingBottom: 'padding-bottom',
  paddingLeft: 'padding-left',
  margin: 'margin',
  marginTop: 'margin-top',
  marginRight: 'margin-right',
  marginBottom: 'margin-bottom',
  marginLeft: 'margin-left',
  flexDirection: 'flex-direction',
  justifyContent: 'justify-content',
  alignItems: 'align-items',
  gap: 'gap',
  flexGrow: 'flex-grow',
  flexShrink: 'flex-shrink',
  flexWrap: 'flex-wrap',
  position: 'position',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
  backgroundColor: 'background-color',
  borderRadius: 'border-radius',
  opacity: 'opacity',
  overflow: 'overflow',
  display: 'display',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  fontFamily: 'font-family',
  color: 'color',
  lineHeight: 'line-height',
  textAlign: 'text-align',
}

const PIXEL_PROPERTIES = new Set([
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'gap',
  'top',
  'right',
  'bottom',
  'left',
  'borderRadius',
  'fontSize',
  'lineHeight',
])

const UNITLESS_PROPERTIES = new Set([
  'flexGrow',
  'flexShrink',
  'opacity',
  'fontWeight',
])

// Keeps CSS width/padding semantics aligned with taffy's border-box sizing.
function ensureBaseStyles(doc: Document): void {
  const id = 'tardis-web-base'
  if (doc.getElementById(id)) return
  const style = doc.createElement('style')
  style.id = id
  style.textContent =
    '[data-tardis]{box-sizing:border-box}[data-tardis="0"]{width:100%;min-height:100vh}'
  doc.head.appendChild(style)
}

export class WebHost {
  private readonly container: HTMLElement
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
    this.root.style.display = 'flex'
    this.root.style.flexDirection = 'column'
    this.root.style.width = '100%'
    this.root.style.minHeight = '100vh'
    this.root.style.background = options.background ?? '#0a0a0a'
    this.root.style.color = options.color ?? '#ededed'
    this.root.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
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
        const element = this.createElement(op.kind)
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

  private createElement(kind: string): HTMLElement {
    const doc = document
    switch (kind) {
      case 'view':
      case 'scroll': {
        const element = doc.createElement('div')
        element.style.display = 'flex'
        element.style.flexDirection = 'column'
        if (kind === 'scroll') element.style.overflow = 'auto'
        return element
      }
      case 'text': {
        const element = doc.createElement('div')
        element.style.display = 'block'
        element.style.whiteSpace = 'pre-wrap'
        element.style.overflowWrap = 'break-word'
        element.style.minWidth = '0'
        return element
      }
      case 'image': {
        const element = doc.createElement('img')
        element.style.display = 'block'
        return element
      }
      case 'fragment': {
        const element = doc.createElement('div')
        element.style.display = 'contents'
        return element
      }
      default: {
        const element = doc.createElement('div')
        element.style.display = 'flex'
        return element
      }
    }
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

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const listener of this.listeners) {
      listener.target.removeEventListener(listener.type, listener.fn)
    }
    this.listeners.length = 0
    const g = globalThis as unknown as Record<string, unknown>
    if (g['__tardis_flush'] === this.flushFn) delete g['__tardis_flush']
    if (currentHost === this) currentHost = null
    this.root.remove()
    this.elements.clear()
  }
}

function toCssValue(key: string, value: unknown): string | null {
  if (key === 'display') {
    if (value === false || value === 'none') return 'none'
    if (value === true) return 'flex'
    return String(value)
  }
  if (key === 'overflow') {
    if (value === 'hidden') return 'hidden'
    if (value === 'scroll' || value === 'auto') return 'auto'
    return 'visible'
  }
  if (typeof value === 'number') {
    if (UNITLESS_PROPERTIES.has(key)) return String(value)
    if (PIXEL_PROPERTIES.has(key)) return `${value}px`
    return String(value)
  }
  return String(value)
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
