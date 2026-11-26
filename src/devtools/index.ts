// Development overlay: scene tree and patch stream inspector.
//
// This is a DOM-only tool. It subscribes to flushed patches, renders the live
// scene tree, and shows the most recent frames. It never mutates the scene.

import { getFocusedNode } from '../scene/render'
import { rootNode, subscribePatches } from '../scene/tree'
import type { Patch, SceneNode } from '../scene/types'

export interface DevtoolsOptions {
  container?: HTMLElement
  startOpen?: boolean
}

export interface DevtoolsHandle {
  readonly element: HTMLElement
  readonly panel: HTMLElement
  toggle(open?: boolean): void
  dispose(): void
}

const MAX_FRAMES = 12
const PANEL_ID = 'tardis-devtools'

function label(node: SceneNode): string {
  const role = node.a11y['role']
  const tag = node.tag || node.kind
  const marker = node.id === getFocusedNode() ? '*' : ''
  const text =
    node.text.length > 40 ? `${node.text.slice(0, 40)}...` : node.text
  return `${marker}${tag} #${node.id}${role ? ` [${role}]` : ''}${
    text ? ` "${text}"` : ''
  }`
}

function flatten(node: SceneNode, depth: number, out: string[]): void {
  for (const child of node.children) {
    out.push(`${'  '.repeat(depth)}${label(child)}`)
    flatten(child, depth + 1, out)
  }
}

function style(element: HTMLElement, values: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, values)
}

export function installDevtools(options: DevtoolsOptions = {}): DevtoolsHandle {
  if (typeof document === 'undefined') {
    throw new Error('tardis: devtools needs a DOM')
  }
  const host = options.container ?? document.body
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.textContent = 'Tardis'
  toggle.setAttribute('aria-expanded', 'false')
  toggle.setAttribute('aria-controls', PANEL_ID)
  style(toggle, {
    position: 'fixed',
    right: '8px',
    bottom: '8px',
    zIndex: '2147483647',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #30363d',
    background: '#161b22',
    color: '#c9d1d9',
    font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
    cursor: 'pointer',
  })

  const panel = document.createElement('section')
  panel.id = PANEL_ID
  panel.setAttribute('aria-label', 'Tardis devtools')
  style(panel, {
    position: 'fixed',
    right: '8px',
    bottom: '40px',
    width: '340px',
    maxHeight: '55vh',
    overflow: 'auto',
    zIndex: '2147483647',
    border: '1px solid #30363d',
    borderRadius: '8px',
    background: '#0d1117',
    color: '#c9d1d9',
    font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
    padding: '8px',
    display: options.startOpen ? 'block' : 'none',
    boxSizing: 'border-box',
  })

  const title = document.createElement('div')
  title.textContent = 'Scene'
  style(title, {
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '4px',
  })
  const tree = document.createElement('pre')
  style(tree, {
    margin: '0 0 8px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: '#c9d1d9',
  })
  const framesTitle = document.createElement('div')
  framesTitle.textContent = 'Patches'
  style(framesTitle, {
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '4px',
  })
  const frames = document.createElement('pre')
  style(frames, {
    margin: '0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: '#7ee787',
  })

  panel.append(title, tree, framesTitle, frames)
  host.append(toggle, panel)

  let open = options.startOpen ?? false
  toggle.setAttribute('aria-expanded', String(open))
  let framesSeen = 0
  let opsSeen = 0
  const log: string[] = []

  const renderTree = (): void => {
    const rows: string[] = []
    flatten(rootNode, 0, rows)
    tree.textContent = rows.length > 0 ? rows.join('\n') : '(empty)'
  }

  const renderFrames = (): void => {
    frames.textContent = `${framesSeen} frames, ${opsSeen} ops\n${log.join('\n')}`
  }

  const unsubscribe = subscribePatches((patch: Patch) => {
    framesSeen += 1
    opsSeen += patch.ops.length
    const kinds = patch.ops.map((op) => op.op)
    log.unshift(`#${patch.frame} ${kinds.join(', ')}`)
    if (log.length > MAX_FRAMES) log.length = MAX_FRAMES
    renderTree()
    renderFrames()
  })

  const setOpen = (next: boolean): void => {
    open = next
    panel.style.display = open ? 'block' : 'none'
    toggle.setAttribute('aria-expanded', String(open))
    if (open) {
      renderTree()
      renderFrames()
    }
  }
  const onClick = (): void => setOpen(!open)
  toggle.addEventListener('click', onClick)

  renderTree()
  renderFrames()

  return {
    element: toggle,
    panel,
    toggle(next?: boolean): void {
      setOpen(next ?? !open)
    },
    dispose(): void {
      unsubscribe()
      toggle.removeEventListener('click', onClick)
      toggle.remove()
      panel.remove()
    },
  }
}
