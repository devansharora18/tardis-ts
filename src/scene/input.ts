// Controlled single-line text input.
//
// The field is built from scene primitives, so it runs on both hosts. The caret
// is a 2 px view; key handling lives in JS and calls onChange. Selection, IME,
// multiline, and native system clipboard integration are future work.

import { pasteClipboard, writeClipboard } from './clipboard'
import { dynamic, jsx } from './jsx'
import { createSignal } from './signals'
import type { SceneEvent, SceneNode } from './types'

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

export interface TextFieldProps {
  value?: MaybeGetter<string>
  onChange?: (value: string) => void
  placeholder?: MaybeGetter<string>
  ariaLabel?: MaybeGetter<string>
  width?: MaybeGetter<number>
  disabled?: MaybeGetter<boolean>
  onSubmit?: () => void
  onBlur?: () => void
}

export function TextField(props: TextFieldProps): SceneNode {
  const controlled = props.value !== undefined
  const [internal, setInternal] = createSignal(read(props.value, ''))
  const [caret, setCaret] = createSignal(0)
  const [focused, setFocused] = createSignal(false)

  const value = (): string =>
    controlled ? read(props.value, '') : internal()
  const safeCaret = (): number => Math.min(caret(), value().length)
  const disabled = (): boolean => read(props.disabled, false)

  const commit = (next: string): void => {
    if (disabled()) return
    props.onChange?.(next)
    if (!controlled) setInternal(next)
  }

  const insert = (text: string): void => {
    const current = value()
    const at = safeCaret()
    commit(current.slice(0, at) + text + current.slice(at))
    setCaret(at + text.length)
  }

  const onKeyDown = (event: SceneEvent): void => {
    if (disabled()) return
    const key = event.key ?? ''
    const mods = event.mods ?? { ctrl: false, shift: false, alt: false, meta: false }
    const command = mods.ctrl || mods.meta
    const current = value()
    const at = safeCaret()

    if (command) {
      switch (key.toLowerCase()) {
        case 'a':
          setCaret(current.length)
          return
        case 'c':
          writeClipboard(current)
          return
        case 'x':
          writeClipboard(current)
          commit('')
          setCaret(0)
          return
        case 'v':
          pasteClipboard((text) => {
            if (text) insert(text)
          })
          return
        default:
          return
      }
    }

    switch (key) {
      case 'Backspace':
        if (at > 0) {
          commit(current.slice(0, at - 1) + current.slice(at))
          setCaret(at - 1)
        }
        return
      case 'Delete':
        if (at < current.length) {
          commit(current.slice(0, at) + current.slice(at + 1))
        }
        return
      case 'ArrowLeft':
        setCaret(Math.max(0, at - 1))
        return
      case 'ArrowRight':
        setCaret(Math.min(current.length, at + 1))
        return
      case 'Home':
        setCaret(0)
        return
      case 'End':
        setCaret(current.length)
        return
      case 'Enter':
        props.onSubmit?.()
        return
      case 'Tab':
      case 'Escape':
        return
      default:
        break
    }

    if (key.length === 1 && !mods.alt) insert(key)
  }

  const label = (): string =>
    read(props.ariaLabel, read(props.placeholder, 'Text field'))

  return jsx(
    'div',
    {
      style: () => ({
        width: read(props.width, 240),
        minHeight: 40,
        padding: 8,
        gap: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: focused() ? '#151515' : '#111111',
        borderRadius: 8,
        color: '#ededed',
        opacity: disabled() ? 0.5 : 1,
      }),
      onKeyDown,
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false)
        props.onBlur?.()
      },
      role: 'textbox',
      'aria-label': () => label(),
      'aria-disabled': () => (disabled() ? 'true' : 'false'),
      tabIndex: 0,
    },
    dynamic(() => {
      const current = value()
      const at = safeCaret()
      if (current === '' && !focused()) {
        return jsx(
          'span',
          { style: { color: '#666666' } },
          read(props.placeholder, '')
        )
      }
      return [
        jsx('span', {}, current.slice(0, at)),
        jsx('div', {
          style: {
            width: 2,
            height: 20,
            borderRadius: 1,
            backgroundColor: focused() ? '#7ee787' : 'transparent',
          },
        }),
        jsx('span', {}, current.slice(at)),
      ]
    })
  )
}
