import type { SceneNode } from './types'

declare global {
  namespace JSX {
    type Element = SceneNode
    interface ElementChildrenAttribute {
      children: unknown
    }
    interface IntrinsicElements {
      [name: string]: Record<string, unknown>
    }
  }
}

export {}
