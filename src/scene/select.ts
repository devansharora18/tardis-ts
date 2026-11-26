// Controlled select built from scene primitives.
//
// The trigger is a combobox; the option list is a listbox rendered below it.
// The list participates in layout (it does not float over other content), which
// keeps hit-testing and keyboard focus identical on web and native.

import { dynamic, jsx } from './jsx'
import { createSignal } from './signals'
import type { SceneEvent, SceneNode } from './types'

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  value: MaybeGetter<string>
  options: MaybeGetter<SelectOption[]>
  onChange: (value: string) => void
  placeholder?: MaybeGetter<string>
  ariaLabel?: MaybeGetter<string>
  width?: MaybeGetter<number>
  disabled?: MaybeGetter<boolean>
}

export function Select(props: SelectProps): SceneNode {
  const [open, setOpen] = createSignal(false)
  const [active, setActive] = createSignal(0)
  const [focused, setFocused] = createSignal(false)

  const value = (): string => read(props.value, '')
  const options = (): SelectOption[] => read(props.options, [])
  const disabled = (): boolean => read(props.disabled, false)
  const selectedIndex = (): number =>
    options().findIndex((option) => option.value === value())
  const selected = (): SelectOption | undefined => options()[selectedIndex()]
  const enabled = (): number[] =>
    options()
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled)
      .map(({ index }) => index)

  const choose = (index: number): void => {
    const option = options()[index]
    if (!option || option.disabled) return
    props.onChange(option.value)
    setOpen(false)
  }

  const move = (direction: 1 | -1): void => {
    const order = enabled()
    if (order.length === 0) return
    const current = order.indexOf(active())
    const next =
      current === -1
        ? order[0]
        : order[(current + direction + order.length) % order.length]
    setActive(next)
  }

  const onKeyDown = (event: SceneEvent): void => {
    if (disabled()) return
    switch (event.key) {
      case 'ArrowDown':
        if (!open()) {
          setOpen(true)
          setActive(Math.max(0, selectedIndex()))
        } else {
          move(1)
        }
        return
      case 'ArrowUp':
        if (!open()) {
          setOpen(true)
          setActive(Math.max(0, selectedIndex()))
        } else {
          move(-1)
        }
        return
      case 'Home':
        if (open()) setActive(enabled()[0] ?? 0)
        return
      case 'End': {
        if (!open()) return
        const order = enabled()
        setActive(order[order.length - 1] ?? 0)
        return
      }
      case 'Enter':
      case ' ':
        if (open()) choose(active())
        else {
          setOpen(true)
          setActive(Math.max(0, selectedIndex()))
        }
        return
      case 'Escape':
        setOpen(false)
        return
      default:
        return
    }
  }

  return jsx(
    'div',
    {
      style: () => ({
        width: read(props.width, 240),
        flexDirection: 'column',
        gap: 4,
        opacity: disabled() ? 0.5 : 1,
      }),
    },
    jsx(
      'div',
      {
        role: 'combobox',
        tabIndex: 0,
        'aria-label': () => read(props.ariaLabel, 'Select'),
        'aria-expanded': () => (open() ? 'true' : 'false'),
        'aria-disabled': () => (disabled() ? 'true' : 'false'),
        onClick: () => {
          if (!disabled()) setOpen(!open())
        },
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        onKeyDown,
        style: () => ({
          minHeight: 40,
          padding: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 8,
          backgroundColor: focused() ? '#151515' : '#111111',
          color: selected() ? '#ededed' : '#666666',
          fontSize: 14,
        }),
      },
      dynamic(() => selected()?.label ?? read(props.placeholder, 'Select…')),
      dynamic(() =>
        jsx('span', { style: { color: '#666666' } }, open() ? '▲' : '▼')
      )
    ),
    dynamic(() => {
      if (!open()) return null
      return jsx(
        'div',
        {
          role: 'listbox',
          'aria-label': () => read(props.ariaLabel, 'Options'),
          style: {
            flexDirection: 'column',
            borderRadius: 8,
            backgroundColor: '#111111',
            padding: 4,
            gap: 2,
          },
        },
        ...options().map((option, index) =>
          jsx(
            'div',
            {
              key: option.value,
              role: 'option',
              'aria-selected': () => (option.value === value() ? 'true' : 'false'),
              'aria-disabled': option.disabled ? 'true' : 'false',
              onClick: () => choose(index),
              style: () => ({
                padding: 8,
                borderRadius: 6,
                fontSize: 14,
                color: option.disabled ? '#555555' : '#ededed',
                backgroundColor:
                  index === active()
                    ? '#264f78'
                    : option.value === value()
                      ? '#1b2b1f'
                      : 'transparent',
              }),
            },
            option.label
          )
        )
      )
    })
  )
}
