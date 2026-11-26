// Mounting and dynamic regions.
//
// A dynamic value is a fragment node with a deferred expression. When the
// fragment is attached, an effect evaluates the expression and reconciles the
// fragment's children. Each evaluation gets a fresh owner so the effects of the
// previous evaluation can be disposed as a unit.

import { createEffect, createOwner, disposeOwner, runWithOwner } from './signals'
import {
  addChild,
  attachNode,
  createNode,
  destroyNode,
  isSceneNode,
  setText,
} from './tree'
import type { DynamicValue, SceneNode } from './types'

export function isDynamic(value: unknown): value is DynamicValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as DynamicValue).__tardisDynamic === true &&
    typeof (value as DynamicValue).fn === 'function'
  )
}

export function isPrimitive(value: unknown): value is string | number | bigint {
  return (
    typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
  )
}

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || typeof value === 'boolean'
}

export function dynamicNode(value: DynamicValue): SceneNode {
  const node = createNode('fragment')
  node.pending = value
  return node
}

export function appendValue(parent: SceneNode, value: unknown): void {
  if (isEmpty(value)) return
  if (Array.isArray(value)) {
    for (const item of value) appendValue(parent, item)
    return
  }
  if (isDynamic(value)) {
    addChild(parent, dynamicNode(value))
    return
  }
  if (isSceneNode(value)) {
    addChild(parent, value)
    return
  }
  if (isPrimitive(value)) {
    const node = createNode('text')
    node.text = String(value)
    addChild(parent, node)
    return
  }
  throw new Error(`tardis: cannot mount value of type ${typeof value}`)
}

export function mountChildren(parent: SceneNode, children: readonly unknown[]): void {
  for (const child of children) appendValue(parent, child)
}

export function activateTree(node: SceneNode): void {
  if (node.pending) {
    const dynamicValue = node.pending
    node.pending = null
    startDynamic(node, dynamicValue)
  }
  for (const child of node.children.slice()) activateTree(child)
}

export function attachAndActivate(node: SceneNode, parent: SceneNode): void {
  attachNode(node, parent)
  activateTree(node)
}

export function mountAttached(parent: SceneNode, value: unknown): void {
  if (isEmpty(value)) return
  if (Array.isArray(value)) {
    for (const item of value) mountAttached(parent, item)
    return
  }
  if (isDynamic(value)) {
    attachAndActivate(dynamicNode(value), parent)
    return
  }
  if (isSceneNode(value)) {
    attachAndActivate(value, parent)
    return
  }
  if (isPrimitive(value)) {
    const node = createNode('text')
    node.text = String(value)
    attachAndActivate(node, parent)
    return
  }
  throw new Error(`tardis: cannot mount value of type ${typeof value}`)
}

function startDynamic(region: SceneNode, dynamicValue: DynamicValue): void {
  const stop = createEffect(() => {
    reconcileDynamic(region, dynamicValue.fn)
  })
  region.dispose = stop
}

function reconcileDynamic(region: SceneNode, fn: () => unknown): void {
  const owner = createOwner()
  let value: unknown
  try {
    value = runWithOwner(owner, fn)
  } catch (err) {
    disposeOwner(owner)
    throw err
  }

  const previous = region.children.slice()

  // Fast path: a primitive updating a single text node. This is the common
  // counter/clock case and avoids destroy + create every keystroke.
  if (isPrimitive(value) && previous.length === 1 && previous[0]!.kind === 'text') {
    setText(previous[0]!, String(value))
    disposeOwner(owner)
    return
  }
  if (isEmpty(value) && previous.length === 0) {
    disposeOwner(owner)
    return
  }

  for (const child of previous) destroyNode(child)
  if (region.contentDispose) {
    region.contentDispose()
    region.contentDispose = null
  }
  region.contentDispose = () => disposeOwner(owner)
  runWithOwner(owner, () => mountAttached(region, value))
}
