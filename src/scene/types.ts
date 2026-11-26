// Scene model shared by the JS runtime and the Rust core.

export type NodeKind = 'view' | 'text' | 'image' | 'scroll' | 'fragment'

export interface SceneEvent {
  type: string
  phase?: 'down' | 'up' | 'move'
  node?: number
  x?: number
  y?: number
  button?: number
  key?: string
  value?: string
  text?: string
  composition?: 'start' | 'update' | 'end'
  composing?: boolean
  action?: string
  replace?: boolean
  dx?: number
  dy?: number
  repeat?: boolean
  mods?: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }
  [key: string]: unknown
}

export type EventHandler = (event: SceneEvent) => void

export interface DynamicValue {
  readonly __tardisDynamic: true
  readonly fn: () => unknown
}

export interface SceneNode {
  id: number
  kind: NodeKind
  tag: string
  a11y: Record<string, string | number | boolean>
  parent: SceneNode | null
  children: SceneNode[]
  style: Record<string, unknown>
  text: string
  src: string
  fit: string | null
  key: string | number | null
  handlers: Partial<Record<string, EventHandler>>
  attached: boolean
  pending: DynamicValue | null
  dispose: (() => void) | null
  contentDispose: (() => void) | null
}

export type HostOp =
  | {
      op: 'create'
      id: number
      kind: NodeKind
      tag: string
      parent: number
      index: number
    }
  | {
      op: 'a11y'
      id: number
      props: Record<string, string | number | boolean | null>
    }
  | { op: 'focus'; id: number | null }
  | { op: 'destroy'; id: number }
  | { op: 'insert'; id: number; parent: number; index: number }
  | { op: 'style'; id: number; props: Record<string, unknown> }
  | { op: 'text'; id: number; value: string }
  | { op: 'image'; id: number; src: string; fit: string }
  | { op: 'scroll'; id: number; x: number; y: number }

export interface Patch {
  v: 0
  frame: number
  ops: HostOp[]
}

export type Style = Record<string, unknown>
