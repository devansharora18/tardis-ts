// Text input built from scene primitives, so it works on web and native.
//
// Editing model: `anchor` is where the selection began and `caret` is the
// active end. Shift+movement extends from the anchor; plain movement collapses
// the selection. Rendering splits each line into plain/highlighted runs and
// places the caret at its exact offset.

import { pasteClipboard, writeClipboard } from './clipboard'
import { dynamic, jsx } from './jsx'
import { createSignal } from './signals'
import type { SceneEvent, SceneNode } from './types'

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

const LINE_HEIGHT = 22
const CARET_HEIGHT = 20
const SELECTION_COLOR = '#264f78'
const CARET_COLOR = '#7ee787'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isSpace(char: string | undefined): boolean {
  return char !== undefined && /\s/.test(char)
}

function previousWord(text: string, at: number): number {
  let index = at
  while (index > 0 && isSpace(text[index - 1])) index -= 1
  while (index > 0 && !isSpace(text[index - 1])) index -= 1
  return index
}

function nextWord(text: string, at: number): number {
  let index = at
  while (index < text.length && isSpace(text[index])) index += 1
  while (index < text.length && !isSpace(text[index])) index += 1
  return index
}

interface Line {
  text: string
  start: number
  end: number
}

function splitLines(text: string): Line[] {
  const lines: Line[] = []
  let start = 0
  for (let index = 0; index <= text.length; index += 1) {
    if (index === text.length || text[index] === '\n') {
      lines.push({ text: text.slice(start, index), start, end: index })
      start = index + 1
    }
  }
  return lines
}

function lineIndexAt(lines: Line[], caret: number): number {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (caret >= line.start && caret <= line.end) return index
  }
  return lines.length - 1
}

export interface TextFieldProps {
  value?: MaybeGetter<string>
  onChange?: (value: string) => void
  placeholder?: MaybeGetter<string>
  ariaLabel?: MaybeGetter<string>
  width?: MaybeGetter<number>
  disabled?: MaybeGetter<boolean>
  multiline?: MaybeGetter<boolean>
  /** Minimum visible rows; the field grows with its content. */
  rows?: MaybeGetter<number>
  onSubmit?: () => void
  onBlur?: () => void
  onFocus?: () => void
}

export function TextField(props: TextFieldProps): SceneNode {
  const controlled = props.value !== undefined
  const [internal, setInternal] = createSignal(read(props.value, ''))
  const [caret, setCaret] = createSignal(0)
  const [anchor, setAnchor] = createSignal(0)
  const [focused, setFocused] = createSignal(false)

  // Column to keep when moving vertically through lines of different lengths.
  let goalColumn: number | null = null

  const value = (): string => (controlled ? read(props.value, '') : internal())
  const disabled = (): boolean => read(props.disabled, false)
  const multiline = (): boolean => read(props.multiline, false)
  const safeCaret = (): number => clamp(caret(), 0, value().length)
  const selectionStart = (): number => Math.min(anchor(), safeCaret())
  const selectionEnd = (): number => Math.max(anchor(), safeCaret())
  const hasSelection = (): boolean => selectionStart() !== selectionEnd()

  const commit = (next: string): void => {
    if (disabled()) return
    props.onChange?.(next)
    if (!controlled) setInternal(next)
  }

  const collapse = (at: number): void => {
    const next = clamp(at, 0, value().length)
    setAnchor(next)
    setCaret(next)
    goalColumn = null
  }

  const moveTo = (next: number, extend: boolean): void => {
    const target = clamp(next, 0, value().length)
    if (!extend) setAnchor(target)
    setCaret(target)
    goalColumn = null
  }

  const replaceSelection = (text: string): void => {
    const current = value()
    const start = selectionStart()
    const end = selectionEnd()
    commit(current.slice(0, start) + text + current.slice(end))
    collapse(start + text.length)
  }

  const insert = (text: string): void => {
    if (disabled() || text === '') return
    replaceSelection(multiline() ? text : text.replace(/\r?\n/g, ' '))
  }

  const deleteBackward = (): void => {
    if (hasSelection()) {
      replaceSelection('')
      return
    }
    const at = safeCaret()
    if (at > 0) {
      commit(value().slice(0, at - 1) + value().slice(at))
      collapse(at - 1)
    }
  }

  const deleteForward = (): void => {
    if (hasSelection()) {
      replaceSelection('')
      return
    }
    const at = safeCaret()
    if (at < value().length) {
      commit(value().slice(0, at) + value().slice(at + 1))
      collapse(at)
    }
  }

  const selectAll = (): void => {
    setAnchor(0)
    setCaret(value().length)
    goalColumn = null
  }

  const copy = (): void => {
    if (hasSelection()) {
      writeClipboard(value().slice(selectionStart(), selectionEnd()))
    }
  }

  const cut = (): void => {
    if (!hasSelection()) return
    writeClipboard(value().slice(selectionStart(), selectionEnd()))
    replaceSelection('')
  }

  const vertical = (direction: -1 | 1, extend: boolean): void => {
    if (!multiline()) {
      moveTo(direction < 0 ? 0 : value().length, extend)
      return
    }
    const lines = splitLines(value())
    const currentIndex = lineIndexAt(lines, safeCaret())
    const current = lines[currentIndex]
    const column = goalColumn ?? safeCaret() - current.start
    const target = lines[clamp(currentIndex + direction, 0, lines.length - 1)]
    const next = clamp(target.start + Math.min(column, target.text.length), 0, value().length)
    if (!extend) setAnchor(next)
    setCaret(next)
    goalColumn = column
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
          selectAll()
          return
        case 'c':
          copy()
          return
        case 'x':
          cut()
          return
        case 'v':
          pasteClipboard((text) => insert(text))
          return
        case 'home':
          moveTo(0, mods.shift)
          return
        case 'end':
          moveTo(current.length, mods.shift)
          return
        default:
          break
      }
    }

    if (mods.alt) {
      if (key === 'ArrowLeft') {
        moveTo(previousWord(current, at), mods.shift)
        return
      }
      if (key === 'ArrowRight') {
        moveTo(nextWord(current, at), mods.shift)
        return
      }
    }

    switch (key) {
      case 'Backspace':
        deleteBackward()
        return
      case 'Delete':
        deleteForward()
        return
      case 'ArrowLeft':
        moveTo(hasSelection() && !mods.shift ? selectionStart() : at - 1, mods.shift)
        return
      case 'ArrowRight':
        moveTo(hasSelection() && !mods.shift ? selectionEnd() : at + 1, mods.shift)
        return
      case 'ArrowUp':
        vertical(-1, mods.shift)
        return
      case 'ArrowDown':
        vertical(1, mods.shift)
        return
      case 'Home': {
        if (!multiline()) {
          moveTo(0, mods.shift)
          return
        }
        const lines = splitLines(current)
        moveTo(lines[lineIndexAt(lines, at)].start, mods.shift)
        return
      }
      case 'End': {
        if (!multiline()) {
          moveTo(current.length, mods.shift)
          return
        }
        const lines = splitLines(current)
        moveTo(lines[lineIndexAt(lines, at)].end, mods.shift)
        return
      }
      case 'Enter':
        if (multiline() && !command) {
          replaceSelection('\n')
        } else {
          props.onSubmit?.()
        }
        return
      case 'Tab':
      case 'Escape':
        return
      default:
        break
    }

    if (key.length === 1 && !mods.alt) insert(key)
  }

  const label = (): string => read(props.ariaLabel, read(props.placeholder, 'Text field'))
  const rows = (): number => Math.max(1, read(props.rows, 1))
  const lineHeight = LINE_HEIGHT

  const caretView = (): SceneNode =>
    jsx('div', {
      style: {
        width: 2,
        height: CARET_HEIGHT,
        borderRadius: 1,
        backgroundColor: CARET_COLOR,
      },
    })

  const renderLine = (line: Line, index: number): SceneNode => {
    const start = selectionStart()
    const end = selectionEnd()
    const caretAt = focused() ? safeCaret() : null
    const localStart = clamp(start - line.start, 0, line.text.length)
    const localEnd = clamp(end - line.start, 0, line.text.length)
    const localCaret =
      caretAt !== null && caretAt >= line.start && caretAt <= line.end
        ? caretAt - line.start
        : null
    const runs: SceneNode[] = []

    const text = (from: number, to: number, selected: boolean): void => {
      if (to <= from) return
      runs.push(
        jsx(
          'span',
          selected ? { style: { backgroundColor: SELECTION_COLOR } } : {},
          line.text.slice(from, to)
        )
      )
    }

    if (localCaret !== null && localCaret <= localStart) {
      runs.push(caretView())
      text(0, localStart, false)
    } else {
      text(0, localStart, false)
      if (localCaret === localStart) runs.push(caretView())
    }
    text(localStart, localEnd, true)
    if (localCaret === localEnd) runs.push(caretView())
    text(localEnd, line.text.length, false)

    return jsx(
      'div',
      {
        key: `line-${index}`,
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: lineHeight,
        },
      },
      ...runs
    )
  }

  return jsx(
    'div',
    {
      style: () => ({
        width: read(props.width, 240),
        minHeight: rows() * lineHeight + 16,
        padding: 8,
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: focused() ? '#151515' : '#111111',
        borderRadius: 8,
        color: '#ededed',
        fontSize: 14,
        opacity: disabled() ? 0.5 : 1,
      }),
      onKeyDown,
      onFocus: () => {
        setFocused(true)
        props.onFocus?.()
      },
      onBlur: () => {
        setFocused(false)
        setAnchor(safeCaret())
        props.onBlur?.()
      },
      role: 'textbox',
      'aria-label': () => label(),
      'aria-multiline': () => (multiline() ? 'true' : 'false'),
      'aria-disabled': () => (disabled() ? 'true' : 'false'),
      tabIndex: 0,
    },
    dynamic(() => {
      const current = value()
      if (current === '') {
        const nodes: SceneNode[] = []
        if (focused()) nodes.push(caretView())
        nodes.push(
          jsx('span', { style: { color: '#666666' } }, read(props.placeholder, ''))
        )
        return jsx(
          'div',
          {
            style: {
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: lineHeight,
            },
          },
          ...nodes
        )
      }
      return splitLines(current).map((line, index) => renderLine(line, index))
    })
  )
}
