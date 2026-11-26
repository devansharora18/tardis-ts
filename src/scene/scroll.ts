// Scroll container without a native scroll node.
//
// The parent clips with `overflow: hidden`; an absolutely positioned inner view
// is translated by the scroll offset. Wheel events bubble from children. The
// content height is explicit because the scene has no layout-measurement
// feedback channel yet.

import { dynamic, jsx } from './jsx'
import { createSignal } from './signals'
import type { SceneEvent, SceneNode } from './types'

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

export interface ScrollViewProps {
  height: MaybeGetter<number>
  contentHeight: MaybeGetter<number>
  scrollTop?: MaybeGetter<number>
  onScroll?: (value: number) => void
  showScrollbar?: MaybeGetter<boolean>
  children?: unknown[]
}

export function ScrollView(props: ScrollViewProps): SceneNode {
  const [internal, setInternal] = createSignal(0)
  const height = (): number => Math.max(1, read(props.height, 200))
  const contentHeight = (): number =>
    Math.max(height(), read(props.contentHeight, height()))
  const maxScroll = (): number => Math.max(0, contentHeight() - height())
  const controlled = props.scrollTop !== undefined
  const scroll = (): number =>
    Math.min(Math.max(0, controlled ? read(props.scrollTop, 0) : internal()), maxScroll())

  const scrollTo = (next: number): void => {
    const value = Math.min(Math.max(0, next), maxScroll())
    props.onScroll?.(value)
    if (!controlled) setInternal(value)
  }

  const onWheel = (event: SceneEvent): void => {
    scrollTo(scroll() + (event.dy ?? 0))
  }

  const barHeight = (): number => {
    if (contentHeight() <= height()) return 0
    return Math.max(16, (height() * height()) / contentHeight())
  }
  const barTop = (): number => {
    const max = maxScroll()
    if (max <= 0) return 0
    return (scroll() / max) * (height() - barHeight())
  }

  return jsx(
    'div',
    {
      style: () => ({
        height: height(),
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
          top: -scroll(),
        }),
      },
      ...(props.children ?? [])
    ),
    dynamic(() => {
      if (read(props.showScrollbar, true) === false || barHeight() === 0) {
        return null
      }
      return jsx('div', {
        style: {
          position: 'absolute',
          right: 2,
          top: barTop(),
          width: 4,
          height: barHeight(),
          borderRadius: 2,
          backgroundColor: '#333333',
        },
      })
    })
  )
}
