import { jsx, type SceneNode } from '@devansharora18/tardis-ts/scene'
import { colors } from './theme'

export function Button(props: {
  label: string
  onClick?: () => void
  primary?: boolean
  danger?: boolean
  width?: number
  disabled?: boolean
}): SceneNode {
  const background = props.primary
    ? '#238636'
    : props.danger
      ? '#8e1519'
      : colors.panel2
  const border = props.primary
    ? '#2ea043'
    : props.danger
      ? '#f85149'
      : colors.border
  return jsx(
    'div',
    {
      role: 'button',
      tabIndex: 0,
      'aria-disabled': props.disabled ? 'true' : 'false',
      onClick: () => {
        if (!props.disabled) props.onClick?.()
      },
      style: {
        width: props.width,
        paddingTop: 7,
        paddingBottom: 7,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: background,
        color: props.disabled ? colors.dim : colors.text,
        fontSize: 12,
        opacity: props.disabled ? 0.6 : 1,
      },
    },
    props.label
  )
}

export function Badge(props: {
  label: string
  color?: string
}): SceneNode {
  return jsx(
    'span',
    {
      style: {
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 7,
        paddingRight: 7,
        borderRadius: 10,
        backgroundColor: `${props.color ?? colors.accent}22`,
        color: props.color ?? colors.accent,
        fontSize: 11,
      },
    },
    props.label
  )
}

export function Card(props: {
  title?: string
  actions?: SceneNode[]
  children?: unknown[]
  grow?: boolean
}): SceneNode {
  return jsx(
    'div',
    {
      style: {
        flexGrow: props.grow ? 1 : 0,
        gap: 10,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.panel,
      },
    },
    ...(props.title || props.actions
      ? [
          jsx(
            'div',
            {
              style: {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              },
            },
            jsx(
              'span',
              { style: { fontSize: 13, fontWeight: 600, color: colors.text, flexGrow: 1 } },
              props.title ?? ''
            ),
            ...(props.actions ?? [])
          ),
        ]
      : []),
    ...(props.children ?? [])
  )
}

export function Page(props: {
  title: string
  subtitle?: string
  actions?: SceneNode[]
  children?: unknown[]
}): SceneNode {
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        padding: 24,
        gap: 16,
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: 13,
      },
    },
    jsx(
      'div',
      {
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
      },
      jsx('span', { style: { fontSize: 20, fontWeight: 600, width: 220 } }, props.title),
      props.subtitle
        ? jsx(
            'span',
            { style: { color: colors.muted, fontSize: 12, flexGrow: 1 } },
            props.subtitle
          )
        : jsx('div', { style: { flexGrow: 1 } }),
      ...(props.actions ?? [])
    ),
    ...(props.children ?? [])
  )
}

export function Divider(): SceneNode {
  return jsx('div', {
    style: { height: 1, backgroundColor: colors.border },
  })
}

export function Empty(props: {
  title: string
  hint?: string
}): SceneNode {
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 40,
      },
    },
    jsx('span', { style: { color: colors.muted, fontSize: 14 } }, props.title),
    props.hint
      ? jsx('span', { style: { color: colors.dim, fontSize: 12 } }, props.hint)
      : null
  )
}
