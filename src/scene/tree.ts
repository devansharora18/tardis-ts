// Scene tree and host patch buffer.
//
// Nodes are built detached, then attached top-down. That ordering matters:
// a `create` op can only reference a parent the host already knows, so the
// subtree is emitted from the root down when it is attached, never bottom-up.

import type { HostOp, NodeKind, Patch, SceneNode, Style } from './types'

export const ROOT_ID = 0
export const rootNode: SceneNode = {
  id: ROOT_ID,
  kind: 'fragment',
  tag: '',
  a11y: {},
  parent: null,
  children: [],
  style: {},
  text: '',
  src: '',
  fit: null,
  key: null,
  handlers: {},
  attached: true,
  pending: null,
  dispose: null,
  contentDispose: null,
}

const nodes = new Map<number, SceneNode>([[ROOT_ID, rootNode]])
let nextId = 1
let frame = 0
let ops: HostOp[] = []
let scheduled = false

function emit(op: HostOp): void {
  ops.push(op)
  schedule()
}

function schedule(): void {
  if (scheduled) return
  scheduled = true
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(flushNow)
  } else {
    Promise.resolve().then(flushNow)
  }
}

function hostFlush(): ((json: string) => void) | null {
  const g = globalThis as unknown as Record<string, unknown>
  const fn = g['__tardis_flush']
  return typeof fn === 'function' ? (fn as (json: string) => void) : null
}

type PatchListener = (patch: Patch) => void
const patchListeners = new Set<PatchListener>()

/** Observe each flushed patch. Returns an unsubscribe function. */
export function subscribePatches(listener: PatchListener): () => void {
  patchListeners.add(listener)
  return () => patchListeners.delete(listener)
}

export function flushNow(): void {
  scheduled = false
  if (ops.length === 0) return
  const g = globalThis as unknown as Record<string, unknown>
  const flush = hostFlush()
  const fast = g['__tardis_flush_patch']
  if (!flush && typeof fast !== 'function') return
  const payload: Patch = { v: 0, frame: ++frame, ops }
  ops = []
  for (const listener of patchListeners) {
    try {
      listener(payload)
    } catch (err) {
      console.error('tardis: patch listener failed', err)
    }
  }
  if (typeof fast === 'function') {
    ;(fast as (patch: Patch) => void)(payload)
    return
  }
  flush?.(JSON.stringify(payload))
}

export function emitFocus(id: number | null): void {
  emit({ op: 'focus', id })
}

export function pendingOps(): number {
  return ops.length
}

export function getNode(id: number): SceneNode | undefined {
  return nodes.get(id)
}

export function isSceneNode(value: unknown): value is SceneNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    nodes.has((value as SceneNode).id)
  )
}

export function createNode(kind: NodeKind, tag = ''): SceneNode {
  const node: SceneNode = {
    id: nextId++,
    kind,
    tag,
    a11y: {},
    parent: null,
    children: [],
    style: {},
    text: '',
    src: '',
    fit: null,
    key: null,
    handlers: {},
    attached: false,
    pending: null,
    dispose: null,
    contentDispose: null,
  }
  nodes.set(node.id, node)
  return node
}

export function addChild(parent: SceneNode, child: SceneNode): void {
  if (child.parent && child.parent !== parent) {
    const at = child.parent.children.indexOf(child)
    if (at >= 0) child.parent.children.splice(at, 1)
  }
  if (!child.parent) child.parent = parent
  if (!parent.children.includes(child)) parent.children.push(child)
}

function emitTree(node: SceneNode): void {
  node.attached = true
  const parent = node.parent
  const index = parent ? parent.children.indexOf(node) : 0
  emit({
    op: 'create',
    id: node.id,
    kind: node.kind,
    tag: node.tag,
    parent: parent ? parent.id : ROOT_ID,
    index,
  })
  if (Object.keys(node.a11y).length > 0) {
    emit({ op: 'a11y', id: node.id, props: { ...node.a11y } })
  }
  if (Object.keys(node.style).length > 0) {
    emit({ op: 'style', id: node.id, props: { ...node.style } })
  }
  if (node.kind === 'text' && node.text !== '') {
    emit({ op: 'text', id: node.id, value: node.text })
  }
  if (node.kind === 'image' && node.src) {
    emit({ op: 'image', id: node.id, src: node.src, fit: node.fit ?? 'cover' })
  }
  for (const child of node.children) emitTree(child)
}

export function attachNode(node: SceneNode, parent: SceneNode): void {
  if (node.attached) return
  if (node.parent !== parent) addChild(parent, node)
  emitTree(node)
}

export function setA11y(
  node: SceneNode,
  key: string,
  value: string | number | boolean | null | undefined
): void {
  if (value === null || value === undefined) {
    if (!(key in node.a11y)) return
    delete node.a11y[key]
    if (node.attached) {
      emit({ op: 'a11y', id: node.id, props: { [key]: null } })
    }
    return
  }
  if (node.a11y[key] === value) return
  node.a11y[key] = value
  if (node.attached) {
    emit({ op: 'a11y', id: node.id, props: { [key]: value } })
  }
}

export function setText(node: SceneNode, value: string): void {
  const next = String(value ?? '')
  if (node.text === next) return
  node.text = next
  if (node.attached) emit({ op: 'text', id: node.id, value: next })
}

export function replaceStyle(node: SceneNode, next: Style): void {
  const prev = node.style
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) continue
    if (prev[key] !== value) patch[key] = value
  }
  for (const key of Object.keys(prev)) {
    if (!(key in next) || next[key] === undefined) patch[key] = null
  }
  node.style = normalizeStyle(next)
  if (node.attached && Object.keys(patch).length > 0) {
    emit({ op: 'style', id: node.id, props: patch })
  }
}

function normalizeStyle(style: Style): Style {
  const out: Style = {}
  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

export function setImage(node: SceneNode, src: string, fit = 'cover'): void {
  node.src = src
  node.fit = fit
  if (node.attached) emit({ op: 'image', id: node.id, src, fit })
}

export function setScroll(node: SceneNode, x: number, y: number): void {
  if (node.attached) emit({ op: 'scroll', id: node.id, x, y })
}

// A destroy op removes the whole subtree on the host, so only the top node
// emits. Effects are disposed for every node either way.
export function destroyNode(node: SceneNode): void {
  for (const child of node.children.slice()) destroyNode(child)
  if (node.dispose) {
    try {
      node.dispose()
    } catch (err) {
      console.error(err)
    }
    node.dispose = null
  }
  if (node.contentDispose) {
    try {
      node.contentDispose()
    } catch (err) {
      console.error(err)
    }
    node.contentDispose = null
  }
  if (node.parent) {
    const at = node.parent.children.indexOf(node)
    if (at >= 0) node.parent.children.splice(at, 1)
  }
  if (node.attached && node.id !== ROOT_ID) {
    emit({ op: 'destroy', id: node.id })
  }
  node.attached = false
  node.parent = null
  if (node.id !== ROOT_ID) nodes.delete(node.id)
}
