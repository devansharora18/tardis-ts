// Modal dialog with a focus trap.
//
// The overlay stays mounted (display:none when closed) so the panel id and its
// scene subtree are stable. Opening traps Tab, focuses the first tabbable
// control, and closing restores the previous focus. Escape calls onClose.

import { dynamic, jsx } from './jsx'
import { createEffect, createSignal, onCleanup } from './signals'
import { focusNext, focusNode, getFocusedNode, setFocusTrap } from './render'
import type { SceneEvent, SceneNode } from './types'

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

export interface DialogProps {
  open: MaybeGetter<boolean>
  onClose: () => void
  title?: MaybeGetter<string>
  width?: MaybeGetter<number>
  children?: unknown[]
}

export function Dialog(props: DialogProps): SceneNode {
  const [active, setActive] = createSignal(false)
  let previous: number | null = null
  let panel: SceneNode | null = null

  const open = (): boolean => read(props.open, false)

  createEffect(() => {
    const next = open()
    if (next === active()) return
    setActive(next)
    if (next) {
      previous = getFocusedNode()
      queueMicrotask(() => {
        if (!open() || !panel) return
        setFocusTrap(panel.id)
        focusNext(1)
      })
    } else {
      setFocusTrap(null)
      if (previous !== null) focusNode(previous)
      previous = null
    }
  })

  onCleanup(() => {
    setFocusTrap(null)
  })

  const onKeyDown = (event: SceneEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault?.()
      props.onClose()
    }
  }

  panel = jsx(
    'div',
    {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': () => read(props.title, 'Dialog'),
      tabIndex: -1,
      onKeyDown,
      style: () => ({
        width: read(props.width, 360),
        padding: 20,
        gap: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#30363d',
        backgroundColor: '#161b22',
        color: '#ededed',
      }),
    },
    dynamic(() => {
      const title = read(props.title, '')
      if (!title) return null
      return jsx('h2', { style: { fontSize: 18, fontWeight: 600 } }, title)
    }),
    ...(props.children ?? [])
  )

  return jsx(
    'div',
    {
      style: () => ({
        display: open() ? 'flex' : 'none',
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
      }),
    },
    panel
  )
}
