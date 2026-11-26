// Server-side string host.
//
// Applies the same scene patch stream as the browser host but keeps a plain
// node table and serializes it to HTML. No DOM is involved.

import type { HostOp, NodeKind, Patch } from '../scene/types'
import { defaultStyle, rootStyle, styleToCss } from '../web/style'
import { semanticTag } from '../web/tags'

interface StringNode {
  id: number
  kind: NodeKind
  tag: string
  parent: number | null
  children: number[]
  style: Record<string, unknown>
  a11y: Record<string, string | number | boolean>
  text: string
  src: string
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

export class StringHost {
  private readonly nodes = new Map<number, StringNode>()
  private readonly root: StringNode

  constructor() {
    this.root = {
      id: 0,
      kind: 'fragment',
      tag: '',
      parent: null,
      children: [],
      style: {},
      a11y: {},
      text: '',
      src: '',
    }
    this.nodes.set(0, this.root)
  }

  flush = (json: string): void => {
    const patch = JSON.parse(json) as Patch
    for (const op of patch.ops) this.apply(op)
  }

  html(): string {
    const style = styleToCss(rootStyle())
    const children = this.root.children
      .map((id) => this.serialize(id))
      .join('')
    return `<div data-tardis="0" style="${escapeAttr(style)}">${children}</div>`
  }

  private apply(op: HostOp): void {
    switch (op.op) {
      case 'create': {
        if (this.nodes.has(op.id)) return
        const parent = this.nodes.get(op.parent)
        if (!parent) return
        const node: StringNode = {
          id: op.id,
          kind: op.kind,
          tag: op.tag ?? '',
          parent: op.parent,
          children: [],
          style: {},
          a11y: {},
          text: '',
          src: '',
        }
        const index = Math.min(op.index, parent.children.length)
        parent.children.splice(index, 0, op.id)
        this.nodes.set(op.id, node)
        break
      }
      case 'destroy': {
        const node = this.nodes.get(op.id)
        if (!node) return
        const remove = (id: number): void => {
          const current = this.nodes.get(id)
          if (!current) return
          for (const child of current.children.slice()) remove(child)
          this.nodes.delete(id)
        }
        remove(op.id)
        if (node.parent !== null) {
          const parent = this.nodes.get(node.parent)
          if (parent) parent.children = parent.children.filter((id) => id !== op.id)
        }
        break
      }
      case 'insert': {
        const node = this.nodes.get(op.id)
        const parent = this.nodes.get(op.parent)
        if (!node || !parent || node === parent) return
        if (node.parent !== null) {
          const old = this.nodes.get(node.parent)
          if (old) old.children = old.children.filter((id) => id !== op.id)
        }
        node.parent = op.parent
        parent.children.splice(Math.min(op.index, parent.children.length), 0, op.id)
        break
      }
      case 'style': {
        const node = this.nodes.get(op.id)
        if (!node) return
        for (const [key, value] of Object.entries(op.props)) {
          if (value === null || value === undefined) delete node.style[key]
          else node.style[key] = value
        }
        break
      }
      case 'a11y': {
        const node = this.nodes.get(op.id)
        if (!node) return
        for (const [key, value] of Object.entries(op.props)) {
          if (value === null || value === undefined) delete node.a11y[key]
          else node.a11y[key] = value
        }
        break
      }
      case 'text': {
        const node = this.nodes.get(op.id)
        if (node) node.text = op.value
        break
      }
      case 'image': {
        const node = this.nodes.get(op.id)
        if (node) node.src = op.src
        break
      }
      case 'scroll':
        break
    }
  }

  private serialize(id: number): string {
    const node = this.nodes.get(id)
    if (!node) return ''
    if (node.kind === 'text') {
      const tag = semanticTag('text', node.tag)
      const style = styleToCss({
        ...defaultStyle('text', node.tag),
        ...node.style,
      })
      return `<${tag}${this.attributes(node, style)}>${escapeText(
        node.text
      )}</${tag}>`
    }
    if (node.kind === 'image') {
      const style = styleToCss({
        ...defaultStyle('image', node.tag),
        ...node.style,
      })
      const src = node.src ? ` src="${escapeAttr(node.src)}"` : ''
      return `<img${this.attributes(node, style)}${src}>`
    }
    const tag = semanticTag(node.kind, node.tag)
    const style = styleToCss({
      ...defaultStyle(node.kind, node.tag),
      ...node.style,
    })
    const children = node.children.map((child) => this.serialize(child)).join('')
    return `<${tag}${this.attributes(node, style)}>${children}</${tag}>`
  }

  private attributes(node: StringNode, style: string): string {
    let out = ` data-tardis="${node.id}"`
    if (style) out += ` style="${escapeAttr(style)}"`
    for (const [key, value] of Object.entries(node.a11y)) {
      if (value === null || value === undefined) continue
      const attribute =
        key === 'tabIndex' ? 'tabindex' : key === 'className' ? 'class' : key
      out += ` ${attribute}="${escapeAttr(String(value))}"`
    }
    return out
  }
}
