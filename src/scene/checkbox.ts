// Accessible checkbox built from scene primitives.

import { dynamic, jsx } from './jsx'
import type { SceneNode } from './types'

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

export interface CheckboxProps {
  checked: MaybeGetter<boolean>
  onChange?: (checked: boolean) => void
  label?: MaybeGetter<string>
  ariaLabel?: MaybeGetter<string>
}

export function Checkbox(props: CheckboxProps): SceneNode {
  const checked = (): boolean => read(props.checked, false)
  const label = (): string => read(props.label, '')
  const toggle = (): void => props.onChange?.(!checked())

  return jsx(
    'div',
    {
      style: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 28,
      },
      onClick: toggle,
      role: 'checkbox',
      'aria-checked': () => (checked() ? 'true' : 'false'),
      'aria-label': () => read(props.ariaLabel, label()),
      tabIndex: 0,
    },
    jsx(
      'div',
      {
        style: {
          width: 18,
          height: 18,
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked() ? '#7ee787' : '#222222',
        },
      },
      dynamic(() =>
        checked()
          ? jsx(
              'span',
              { style: { color: '#0a0a0a', fontSize: 12, fontWeight: 700 } },
              '✓'
            )
          : null
      )
    ),
    jsx('span', {}, label())
  )
}
