import { createRoot } from './signals'
import { destroyNode, emitFocus, flushNow, getNode, rootNode } from './tree'
import { mountAttached } from './mount'
import type { EventHandler, SceneEvent, SceneNode } from './types'

let installed = false
let pressed: number | null = null
let focused: number | null = null
let trapped: number | null = null

function installEventHook(): void {
  if (installed) return
  installed = true
  const g = globalThis as unknown as Record<string, unknown>
  g['__tardis_ts_event'] = (json: string): void => {
    try {
      dispatchEvent(JSON.parse(json) as SceneEvent)
    } catch (err) {
      console.error(err)
    }
  }
}

export interface RenderHandle {
  dispose(): void
  root: SceneNode
}

export function render(factory: () => unknown): RenderHandle {
  installEventHook()
  let disposeRoot: (() => void) | null = null
  createRoot((dispose) => {
    disposeRoot = dispose
    mountAttached(rootNode, factory())
  })
  flushNow()
  return {
    root: rootNode,
    dispose(): void {
      disposeRoot?.()
      disposeRoot = null
      for (const child of rootNode.children.slice()) destroyNode(child)
      flushNow()
    },
  }
}

function setFocus(id: number | null): void {
  if (focused === id) return
  const previous = focused !== null ? getNode(focused) : null
  if (previous) {
    const blur = nearestHandler(previous.id, 'onBlur')
    blur?.handler({ type: 'blur', node: previous.id })
  }
  focused = id
  emitFocus(id)
  if (id !== null) {
    const focus = nearestHandler(id, 'onFocus')
    focus?.handler({ type: 'focus', node: id })
  }
}

export function focusNode(id: number | null): void {
  setFocus(id)
  flushNow()
}

export function getFocusedNode(): number | null {
  return focused
}

/** Confine Tab traversal to a subtree (modal dialogs). */
export function setFocusTrap(id: number | null): void {
  trapped = id
}

interface Tabbable {
  id: number
  index: number
  order: number
}

function collectTabbables(): Tabbable[] {
  const found: Tabbable[] = []
  let order = 0
  const walk = (node: SceneNode): void => {
    const tabIndex = node.a11y['tabIndex']
    const disabled = node.a11y['aria-disabled'] === 'true'
    if (
      typeof tabIndex === 'number' &&
      tabIndex >= 0 &&
      !disabled &&
      node.style.display !== false
    ) {
      found.push({ id: node.id, index: order, order: tabIndex })
    }
    order += 1
    for (const child of node.children) walk(child)
  }
  if (trapped !== null) {
    const container = getNode(trapped)
    if (container) walk(container)
  } else {
    for (const child of rootNode.children) walk(child)
  }
  return found.sort((a, b) => a.order - b.order || a.index - b.index)
}

/** Move focus to the next (`direction` 1) or previous tabbable node. */
export function focusNext(direction: 1 | -1): void {
  const tabbables = collectTabbables()
  if (tabbables.length === 0) {
    if (trapped !== null) setFocus(trapped)
    return
  }
  const current = focused === null ? -1 : tabbables.findIndex((entry) => entry.id === focused)
  const next =
    current === -1
      ? direction === 1
        ? 0
        : tabbables.length - 1
      : (current + direction + tabbables.length) % tabbables.length
  setFocus(tabbables[next].id)
}

export function dispatchEvent(event: SceneEvent): void {
  if (event.type === 'pointer') {
    const target = typeof event.node === 'number' ? event.node : null
    if (event.phase === 'down') {
      pressed = target
      setFocus(focusableAncestor(target))
      if (target !== null) {
        nearestHandler(target, 'onPointerDown')?.handler(event)
      }
      flushNow()
      return
    }
    if (event.phase === 'move') {
      if (pressed !== null) {
        nearestHandler(pressed, 'onPointerMove')?.handler(event)
      }
      flushNow()
      return
    }
    if (event.phase === 'up') {
      if (target !== null && pressed !== null) {
        const down = clickableAncestor(pressed)
        const up = clickableAncestor(target)
        if (down && up && down.node.id === up.node.id) up.handler(event)
      }
      const upNode = pressed ?? target
      if (upNode !== null) {
        nearestHandler(upNode, 'onPointerUp')?.handler(event)
      }
      pressed = null
      flushNow()
      return
    }
    return
  }
  if (event.type === 'key') {
    const phase = event.phase ?? 'down'
    if (phase === 'down' && event.key === 'Tab') {
      const tab =
        focused !== null ? nearestHandler(focused, 'onTab') : null
      tab?.handler(event)
      if (event.defaultPrevented) {
        flushNow()
        return
      }
      focusNext(event.mods?.shift ? -1 : 1)
      flushNow()
      return
    }
    if (phase === 'down' && (event.key === 'Enter' || event.key === ' ')) {
      const keyHandled =
        focused !== null &&
        getNode(focused)?.handlers['onKeyDown'] !== undefined
      if (!keyHandled) {
        const entry = focused !== null ? clickableAncestor(focused) : null
        entry?.handler(event)
      }
    }
    let node: SceneNode | null =
      focused !== null ? getNode(focused) ?? null : null
    while (node) {
      const handler =
        node.handlers[phase === 'up' ? 'onKeyUp' : 'onKeyDown']
      if (handler) {
        handler(event)
        break
      }
      node = node.parent
    }
    flushNow()
    return
  }
  if (event.type === 'a11y') {
    const id = typeof event.node === 'number' ? event.node : null
    if (event.action === 'focus') {
      setFocus(id)
      flushNow()
      return
    }
    if (event.action === 'default' && id !== null) {
      const entry = clickableAncestor(id)
      entry?.handler({ ...event, type: 'click', node: id })
      flushNow()
      return
    }
    if (
      (event.action === 'replace-text' || event.action === 'set-value') &&
      typeof event.text === 'string'
    ) {
      let node: SceneNode | null = focused !== null ? getNode(focused) ?? null : null
      while (node) {
        const handler = node.handlers['onText']
        if (handler) {
          handler({
            type: 'text',
            text: event.text,
            composition: 'end',
            replace: event.action === 'set-value',
          })
          break
        }
        node = node.parent
      }
      flushNow()
      return
    }
    return
  }
  if (event.type === 'text') {
    let node: SceneNode | null = focused !== null ? getNode(focused) ?? null : null
    while (node) {
      const handler = node.handlers['onText']
      if (handler) {
        handler(event)
        break
      }
      node = node.parent
    }
    flushNow()
    return
  }
  if (event.type === 'wheel') {
    let node: SceneNode | null =
      typeof event.node === 'number' ? getNode(event.node) ?? null : null
    while (node) {
      const handler = node.handlers['onWheel']
      if (handler) {
        handler(event)
        break
      }
      node = node.parent
    }
    flushNow()
    return
  }
  // Keyboard and text input arrive with the focus subsystem.
  flushNow()
}

function focusableAncestor(id: number | null): number | null {
  let node: SceneNode | null = id === null ? null : getNode(id) ?? null
  while (node) {
    const tabIndex = node.a11y['tabIndex']
    if (typeof tabIndex === 'number' && tabIndex >= 0) return node.id
    if (node.a11y['aria-disabled'] === 'true') return null
    node = node.parent
  }
  return id
}

function nearestHandler(
  id: number,
  name: string
): { node: SceneNode; handler: EventHandler } | null {
  let node: SceneNode | null = getNode(id) ?? null
  while (node) {
    const handler = node.handlers[name]
    if (handler) return { node, handler }
    node = node.parent
  }
  return null
}

function clickableAncestor(
  id: number
): { node: SceneNode; handler: EventHandler } | null {
  let node: SceneNode | null = getNode(id) ?? null
  while (node) {
    const handler = node.handlers['onClick'] ?? node.handlers['onPress']
    if (handler) return { node, handler }
    node = node.parent
  }
  return null
}
