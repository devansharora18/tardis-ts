// Virtualized list.
//
// Only the visible slice plus an overscan window is mounted in the scene. The
// dialog scrolls by moving an absolutely positioned inner container; the parent
// clips it with `overflow: hidden`. Wheel events bubble to the list container.
//
// This is the production shape for large data sets: 10,000 rows cost roughly
// one screen of nodes, not 10,000.

import { dynamic, jsx } from './jsx'
import { createMemo, createSignal } from './signals'
import type { SceneEvent, SceneNode } from './types'

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

export interface VirtualListProps<T> {
  items: MaybeGetter<T[]>
  rowHeight: MaybeGetter<number>
  height: MaybeGetter<number>
  renderRow: (item: T, index: number) => SceneNode
  overscan?: MaybeGetter<number>
  /** Controlled scroll offset. When omitted the list manages its own. */
  scrollTop?: MaybeGetter<number>
  onScroll?: (value: number) => void
}

export function VirtualList<T>(props: VirtualListProps<T>): SceneNode {
  const [internalScroll, setInternalScroll] = createSignal(0)

  const scroll = createMemo(() => {
    if (props.scrollTop !== undefined) {
      return Math.max(0, read(props.scrollTop, 0))
    }
    return internalScroll()
  })

  const windowInfo = createMemo(() => {
    const items = read(props.items, [] as T[])
    const rowHeight = Math.max(1, read(props.rowHeight, 32))
    const height = Math.max(1, read(props.height, 400))
    const overscan = Math.max(0, read(props.overscan, 2))
    const maxScroll = Math.max(0, items.length * rowHeight - height)
    const top = Math.min(Math.max(0, scroll()), maxScroll)
    const start = Math.max(0, Math.floor(top / rowHeight) - overscan)
    const end = Math.min(
      items.length,
      Math.ceil((top + height) / rowHeight) + overscan
    )
    return { items, start, end, top, rowHeight, height, maxScroll }
  })

  const scrollTo = (next: number): void => {
    const value = Math.min(Math.max(0, next), windowInfo().maxScroll)
    if (props.onScroll) props.onScroll(value)
    if (props.scrollTop === undefined) setInternalScroll(value)
  }

  const onWheel = (event: SceneEvent): void => {
    scrollTo(scroll() + (event.dy ?? 0))
  }

  const rows = (): SceneNode[] => {
    const info = windowInfo()
    return info.items
      .slice(info.start, info.end)
      .map((item, offset) => props.renderRow(item, info.start + offset))
  }

  return jsx(
    'div',
    {
      style: () => ({
        height: windowInfo().height,
        overflow: 'hidden',
        position: 'relative',
      }),
      onWheel,
    },
    jsx(
      'div',
      {
        style: () => ({
          position: 'absolute',
          left: 0,
          right: 0,
          top: windowInfo().start * windowInfo().rowHeight - windowInfo().top,
        }),
      },
      dynamic(rows)
    )
  )
}
