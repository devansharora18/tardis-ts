// Radio group with roving focus.
//
// Only the selected option (or the first enabled option) is in the tab order.
// Arrow keys select and move focus; clicking selects directly.

import { jsx } from './jsx'
import { focusNode } from './render'
import { createSignal } from './signals'
import type { SceneEvent, SceneNode } from './types'

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

export interface RadioOption {
  value: string
  label: string
  disabled?: boolean
}

export interface RadioGroupProps {
  value: MaybeGetter<string>
  options: MaybeGetter<RadioOption[]>
  onChange: (value: string) => void
  ariaLabel?: MaybeGetter<string>
  direction?: MaybeGetter<'row' | 'column'>
}

export function RadioGroup(props: RadioGroupProps): SceneNode {
  const options = (): RadioOption[] => read(props.options, [])
  const value = (): string => read(props.value, '')
  const [focused, setFocused] = createSignal(false)
  let nodes: SceneNode[] = []

  const enabled = (): number[] =>
    options()
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled)
      .map(({ index }) => index)

  const choose = (index: number, moveFocus = false): void => {
    const option = options()[index]
    if (!option || option.disabled) return
    props.onChange(option.value)
    if (moveFocus && nodes[index]) focusNode(nodes[index].id)
  }

  const onKeyDown = (event: SceneEvent): void => {
    const order = enabled()
    if (order.length === 0) return
    const current = order.findIndex((index) => options()[index]?.value === value())
    const at = current === -1 ? 0 : current
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        choose(order[(at + 1) % order.length], true)
        return
      case 'ArrowLeft':
      case 'ArrowUp':
        choose(order[(at - 1 + order.length) % order.length], true)
        return
      case 'Home':
        choose(order[0], true)
        return
      case 'End':
        choose(order[order.length - 1], true)
        return
      default:
        return
    }
  }

  const selectedIndex = (): number => {
    const index = options().findIndex((option) => option.value === value())
    return index === -1 ? (enabled()[0] ?? 0) : index
  }

  nodes = options().map((option, index) =>
    jsx(
      'div',
      {
        key: option.value,
        role: 'radio',
        'aria-checked': () => (option.value === value() ? 'true' : 'false'),
        'aria-disabled': option.disabled ? 'true' : 'false',
        tabIndex: () => (index === selectedIndex() ? 0 : -1),
        onClick: () => choose(index),
        onKeyDown,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        style: () => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 6,
          borderRadius: 6,
          opacity: option.disabled ? 0.5 : 1,
          backgroundColor:
            focused() && index === selectedIndex() ? '#151515' : 'transparent',
        }),
      },
      jsx(
        'div',
        {
          style: {
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#444444',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
        jsx('div', {
          style: () => ({
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor:
              option.value === value() ? '#7ee787' : '#444444',
          }),
        })
      ),
      jsx('span', { style: { fontSize: 14, color: '#ededed' } }, option.label)
    )
  )

  return jsx(
    'div',
    {
      role: 'radiogroup',
      'aria-label': () => read(props.ariaLabel, 'Options'),
      style: {
        flexDirection: read(props.direction, 'column'),
        gap: 4,
      },
    },
    ...nodes
  )
}
