import { createRoot } from './signals'
import { destroyNode, flushNow, getNode, rootNode } from './tree'
import { mountAttached } from './mount'
import type { EventHandler, SceneEvent, SceneNode } from './types'

let installed = false
let pressed: number | null = null

function installEventHook(): void {
  if (installed) return
  installed = true
  const g = globalThis as unknown as Record<string, unknown>
  g['__tardis_event'] = (json: string): void => {
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

export function dispatchEvent(event: SceneEvent): void {
  if (event.type === 'pointer') {
    const target = typeof event.node === 'number' ? event.node : null
    if (event.phase === 'down') {
      pressed = target
      return
    }
    if (event.phase === 'up') {
      if (target !== null && pressed !== null) {
        const down = clickableAncestor(pressed)
        const up = clickableAncestor(target)
        if (down && up && down.node.id === up.node.id) up.handler(event)
      }
      pressed = null
      flushNow()
      return
    }
    return
  }
  // Keyboard and text input arrive with the focus subsystem.
  flushNow()
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
