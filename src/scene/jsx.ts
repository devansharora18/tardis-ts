// JSX factory for the scene runtime.
//
// The compiler emits `jsx(type, props, ...children)`. Intrinsic tags map to a
// closed set of scene primitives; components are plain functions called once.
// Non-event props arrive as getters from the compiler and are bound to effects.

import { createEffect } from './signals'
import {
  createNode,
  isSceneNode,
  replaceStyle,
  setA11y,
  setImage,
  setText,
} from './tree'
import { isDynamic, isPrimitive, mountChildren } from './mount'
import type {
  DynamicValue,
  EventHandler,
  NodeKind,
  SceneNode,
  Style,
} from './types'

export const Fragment: unique symbol = Symbol.for('tardis-ts.fragment')

export function dynamic(fn: () => unknown): DynamicValue {
  return { __tardisTsDynamic: true, fn }
}

interface TagSpec {
  kind: NodeKind
  style: Style
}

const TAGS: Record<string, TagSpec> = {
  div: { kind: 'view', style: { flexDirection: 'column' } },
  section: { kind: 'view', style: { flexDirection: 'column' } },
  main: { kind: 'view', style: { flexDirection: 'column' } },
  header: { kind: 'view', style: { flexDirection: 'column' } },
  footer: { kind: 'view', style: { flexDirection: 'column' } },
  nav: { kind: 'view', style: { flexDirection: 'row' } },
  ul: { kind: 'view', style: { flexDirection: 'column' } },
  li: { kind: 'view', style: { flexDirection: 'row', gap: 8 } },
  span: { kind: 'text', style: { lineHeight: 22 } },
  label: {
    kind: 'text',
    style: { fontSize: 14, lineHeight: 20, color: '#a1a1a1' },
  },
  strong: { kind: 'text', style: { fontWeight: 700 } },
  em: { kind: 'text', style: { fontStyle: 'italic' } },
  p: {
    kind: 'text',
    style: {
      fontSize: 16,
      lineHeight: 24,
      color: '#c9c9c9',
      marginBottom: 8,
    },
  },
  h1: {
    kind: 'text',
    style: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: 800,
      color: '#ededed',
      marginBottom: 8,
    },
  },
  h2: {
    kind: 'text',
    style: {
      fontSize: 26,
      lineHeight: 31,
      fontWeight: 800,
      color: '#ededed',
      marginBottom: 8,
    },
  },
  h3: {
    kind: 'text',
    style: {
      fontSize: 21,
      lineHeight: 25,
      fontWeight: 700,
      color: '#ededed',
      marginBottom: 6,
    },
  },
  h4: {
    kind: 'text',
    style: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: 700,
      color: '#ededed',
      marginBottom: 6,
    },
  },
  h5: {
    kind: 'text',
    style: {
      fontSize: 16,
      lineHeight: 19,
      fontWeight: 700,
      color: '#ededed',
      marginBottom: 4,
    },
  },
  h6: {
    kind: 'text',
    style: {
      fontSize: 14,
      lineHeight: 17,
      fontWeight: 700,
      color: '#ededed',
      marginBottom: 4,
    },
  },
  button: {
    kind: 'view',
    style: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 16,
      paddingRight: 16,
      backgroundColor: '#ededed',
      color: '#0a0a0a',
      borderRadius: 8,
      gap: 8,
    },
  },
  img: { kind: 'image', style: {} },
}

export function jsx(
  type: string,
  props?: Record<string, unknown>,
  ...children: unknown[]
): SceneNode
export function jsx(
  type: typeof Fragment,
  props?: Record<string, unknown>,
  ...children: unknown[]
): SceneNode
export function jsx<P>(
  type: (props: P) => unknown,
  props?: P,
  ...children: unknown[]
): SceneNode
export function jsx(
  type: string | ((props: any) => unknown) | typeof Fragment,
  props: Record<string, unknown> = {},
  ...children: unknown[]
): SceneNode {
  const key = readKey(props)
  const clean = withoutKey(props)

  if (type === Fragment) {
    const node = fragment(children)
    if (key !== null) node.key = key
    return node
  }
  if (typeof type === 'function') {
    const passed =
      children.length > 0
        ? children
        : Array.isArray(clean['children'])
          ? (clean['children'] as unknown[])
          : []
    const result = type({ ...clean, children: passed })
    const node = normalizeResult(result)
    if (key !== null) node.key = key
    return node
  }
  if (typeof type === 'string') {
    const node = host(type, clean, children)
    if (key !== null) node.key = key
    return node
  }
  throw new Error(`tardis-ts: unsupported JSX element type: ${String(type)}`)
}

function normalizeResult(value: unknown): SceneNode {
  if (isSceneNode(value)) return value
  if (Array.isArray(value)) return fragment(value)
  if (isDynamic(value)) {
    const node = createNode('fragment')
    node.pending = value
    return node
  }
  if (isPrimitive(value)) {
    const node = createNode('text')
    node.text = String(value)
    return node
  }
  if (value === null || value === undefined || typeof value === 'boolean') {
    return fragment([])
  }
  throw new Error(`tardis-ts: component returned an unsupported value (${typeof value})`)
}

function fragment(children: readonly unknown[]): SceneNode {
  const node = createNode('fragment')
  mountChildren(node, children)
  return node
}

function host(tag: string, props: Record<string, unknown>, children: unknown[]): SceneNode {
  const spec = TAGS[tag]
  if (!spec) {
    throw new Error(
      `tardis-ts: unknown element <${tag}>. Supported: ${Object.keys(TAGS).sort().join(', ')}`
    )
  }

  if (spec.kind === 'text') {
    return textHost(tag, spec, props, children)
  }

  const node = createNode(spec.kind, tag)
  applyEvents(node, props)
  applyA11y(node, props)
  if ((tag === 'button' || tag === 'a') && !('tabIndex' in props)) {
    setA11y(node, 'tabIndex', 0)
  }
  bindStyle(node, props['style'], spec.style)
  if (node.kind === 'image') {
    bindImage(node, props)
  }
  mountChildren(node, children)
  return node
}

function textHost(
  tag: string,
  spec: TagSpec,
  props: Record<string, unknown>,
  children: unknown[]
): SceneNode {
  const inline = children.every(
    (child) => isPrimitive(child) || isDynamic(child) || isEmptyChild(child)
  )
  if (inline) {
    const node = createNode('text', tag)
    applyEvents(node, props)
    applyA11y(node, props)
    bindStyle(node, props['style'], spec.style)
    bindText(node, children)
    return node
  }
  // Mixed content (e.g. <p>Hello <strong>world</strong></p>): a row view with
  // the tag's text styles, so children inherit size/weight/color natively.
  const node = createNode('view', tag)
  applyEvents(node, props)
  applyA11y(node, props)
  bindStyle(node, props['style'], {
    ...spec.style,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  })
  mountChildren(node, children)
  return node
}

function isEmptyChild(value: unknown): boolean {
  return value === null || value === undefined || typeof value === 'boolean'
}

function bindText(node: SceneNode, children: readonly unknown[]): void {
  const hasDynamic = children.some(isDynamic)
  if (!hasDynamic) {
    setText(node, children.filter(isPrimitive).map(String).join(''))
    return
  }
  createEffect(() => {
    let text = ''
    for (const child of children) {
      if (isDynamic(child)) {
        const value = child.fn()
        if (isPrimitive(value)) text += String(value)
      } else if (isPrimitive(child)) {
        text += String(child)
      }
    }
    setText(node, text)
  })
}

function bindStyle(
  node: SceneNode,
  styleValue: unknown,
  defaults: Style
): void {
  const apply = (value: unknown): void => {
    const user = value && typeof value === 'object' ? (value as Style) : {}
    replaceStyle(node, { ...defaults, ...user })
  }
  if (typeof styleValue === 'function') {
    createEffect(() => apply((styleValue as () => unknown)()))
  } else {
    apply(styleValue)
  }
}

function bindImage(node: SceneNode, props: Record<string, unknown>): void {
  const src = props['src']
  const fit = typeof props['fit'] === 'string' ? props['fit'] : 'cover'
  if (typeof src === 'function') {
    createEffect(() => setImage(node, String((src as () => unknown)() ?? ''), fit))
  } else if (typeof src === 'string') {
    setImage(node, src, fit)
  }
}

function applyEvents(node: SceneNode, props: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(props)) {
    if (!/^on[A-Z]/.test(name) || typeof value !== 'function') continue
    node.handlers[name] = value as EventHandler
  }
}

function isA11yKey(name: string): boolean {
  return (
    name === 'role' ||
    name === 'tabIndex' ||
    name === 'className' ||
    name.startsWith('aria-') || name === 'draggable'
  )
}

function applyA11y(node: SceneNode, props: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(props)) {
    if (!isA11yKey(name)) continue
    if (typeof value === 'function') {
      createEffect(() => setA11y(node, name, (value as () => unknown)() as A11yValue))
    } else {
      setA11y(node, name, value as A11yValue)
    }
  }
}

type A11yValue = string | number | boolean | null | undefined

function readKey(props: Record<string, unknown>): string | number | null {
  const key = props['key']
  if (typeof key === 'string' || typeof key === 'number') return key
  return null
}

function withoutKey(props: Record<string, unknown>): Record<string, unknown> {
  if (!('key' in props)) return props
  const copy: Record<string, unknown> = { ...props }
  delete copy['key']
  return copy
}
