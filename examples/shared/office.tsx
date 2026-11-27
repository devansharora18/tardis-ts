// Original Fluent-class desktop chrome for the example apps.
// Layout follows the familiar ribbon/title/status model; all artwork is drawn
// from primitives here, not copied from any vendor.

import { dynamic, jsx, type SceneNode } from '@devansharora18/tardis-ts/scene'

export const office = {
  chrome: '#f3f2f1',
  chromeAlt: '#faf9f8',
  surface: '#ffffff',
  ink: '#201f1e',
  muted: '#605e5c',
  dim: '#8a8886',
  border: '#d2d0ce',
  borderSoft: '#e1dfdd',
  hover: '#edebe9',
  tint: '#f3f2f1',
  selection: '#cfe8dc',
  danger: '#a4262c',
}

export const accents = {
  excel: { main: '#107c41', dark: '#0b5e31', tint: '#e2f0d9', soft: '#dff0e7' },
  word: { main: '#185abd', dark: '#12458c', tint: '#deecf9', soft: '#dce9f7' },
  powerpoint: { main: '#c43e1c', dark: '#96300f', tint: '#fbe4dc', soft: '#f8ded5' },
  paint: { main: '#6b4fbb', dark: '#513a94', tint: '#e9e2f7', soft: '#e4dcf5' },
  outlook: { main: '#0f6cbd', dark: '#0a4f8a', tint: '#deecf9', soft: '#dce9f7' },
  access: { main: '#a4373a', dark: '#7c282b', tint: '#f5dfe0', soft: '#f2d8d9' },
  code: { main: '#0078d4', dark: '#005a9e', tint: '#deecf9', soft: '#dce9f7' },
  neutral: { main: '#5c5c5c', dark: '#3d3d3d', tint: '#e8e8e8', soft: '#e3e3e3' },
}

export type Accent = (typeof accents)[keyof typeof accents]
export type IconName =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'fill'
  | 'font'
  | 'table'
  | 'chart'
  | 'paste'
  | 'copy'
  | 'cut'
  | 'undo'
  | 'redo'
  | 'sum'
  | 'percent'
  | 'currency'
  | 'decimal'
  | 'sort'
  | 'filter'
  | 'grid'
  | 'formula'
  | 'comment'
  | 'picture'
  | 'shapes'
  | 'zoom'
  | 'save'
  | 'print'
  | 'check'
  | 'plus'
  | 'minus'
  | 'close'
  | 'more'
  | 'search'
  | 'calendar'
  | 'list'
  | 'settings'
  | 'play'
  | 'page'
  | 'brush'
  | 'boldOff'
  | 'eye'

const GLYPHS: Partial<Record<IconName, string>> = {
  undo: '↶',
  redo: '↷',
  sum: '∑',
  percent: '%',
  currency: '$',
  decimal: '.0',
  sort: '↕',
  filter: '▽',
  formula: 'fx',
  check: '✓',
  plus: '+',
  minus: '−',
  close: '×',
  more: '···',
  search: '⌕',
  calendar: '▦',
  list: '☰',
  settings: '⚙',
  play: '▶',
  page: '▯',
  brush: '◐',
  eye: '◉',
  boldOff: 'B',
}

/** 20px command icon drawn from scene primitives. */
export function Icon(props: {
  name: IconName
  color?: string
  accent?: string
  size?: number
}): SceneNode {
  const size = props.size ?? 20
  const color = props.color ?? office.ink
  const accent = props.accent ?? accents.excel.main
  const glyph = GLYPHS[props.name]
  if (glyph) {
    return jsx(
      'span',
      {
        style: {
          width: size,
          height: size,
          lineHeight: size,
          textAlign: 'center',
          fontSize: props.name === 'formula' ? Math.max(10, size * 0.58) : size * 0.78,
          fontFamily: props.name === 'formula' ? 'serif' : 'sans-serif',
          fontStyle: props.name === 'formula' ? 'italic' : undefined,
          fontWeight: props.name === 'formula' ? 600 : 400,
          color,
        },
      },
      glyph
    )
  }
  const bar = (top: number, width: number, height = 2): SceneNode =>
    jsx('div', {
      style: {
        position: 'absolute',
        top,
        left: 0,
        width,
        height,
        borderRadius: 1,
        backgroundColor: color,
      },
    })
  const box = (left: number, top: number, width: number, height: number): SceneNode =>
    jsx('div', {
      style: {
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 1,
      },
    })
  const text = (value: string, options?: Record<string, unknown>): SceneNode =>
    jsx(
      'span',
      {
        style: {
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size,
          lineHeight: size,
          textAlign: 'center',
          fontSize: size * 0.82,
          color,
          ...options,
        },
      },
      value
    )
  switch (props.name) {
    case 'bold':
      return text('B', { fontWeight: 700 })
    case 'italic':
      return text('I', { fontStyle: 'italic', fontFamily: 'serif' })
    case 'underline':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        text('U', { top: -2 }),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.28,
            top: size * 0.78,
            width: size * 0.44,
            height: 1.5,
            backgroundColor: color,
          },
        })
      )
    case 'alignLeft':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        bar(5, size * 0.78),
        bar(9, size * 0.56),
        bar(13, size * 0.7)
      )
    case 'alignCenter':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        bar(5, size * 0.78),
        bar(9, size * 0.5),
        bar(13, size * 0.66)
      )
    case 'alignRight':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        bar(5, size * 0.78),
        bar(9, size * 0.56),
        bar(13, size * 0.7)
      )
    case 'fill':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.18,
            top: size * 0.1,
            width: size * 0.6,
            height: size * 0.52,
            backgroundColor: accent,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: color,
          },
        }),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.1,
            top: size * 0.74,
            width: size * 0.72,
            height: 3,
            backgroundColor: accent,
            borderRadius: 1,
          },
        })
      )
    case 'font':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        text('A', { top: -1 }),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.66,
            top: size * 0.58,
            width: size * 0.26,
            height: 2,
            backgroundColor: accent,
          },
        })
      )
    case 'table':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(2, 4, size - 4, size - 7),
        jsx('div', {
          style: {
            position: 'absolute',
            left: 3,
            top: size * 0.5,
            width: size - 6,
            height: 1,
            backgroundColor: color,
          },
        }),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.5,
            top: 5,
            width: 1,
            height: size - 9,
            backgroundColor: color,
          },
        })
      )
    case 'chart':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        jsx('div', {
          style: {
            position: 'absolute',
            left: 3,
            top: size * 0.56,
            width: 4,
            height: size * 0.3,
            backgroundColor: color,
          },
        }),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.4,
            top: size * 0.4,
            width: 4,
            height: size * 0.46,
            backgroundColor: color,
          },
        }),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.7,
            top: size * 0.24,
            width: 4,
            height: size * 0.62,
            backgroundColor: accent,
          },
        })
      )
    case 'paste':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(4, 2, size - 8, size - 4),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.32,
            top: 0,
            width: size * 0.36,
            height: 4,
            backgroundColor: office.chromeAlt,
            borderWidth: 1,
            borderColor: color,
            borderRadius: 1,
          },
        })
      )
    case 'copy':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(2, 4, size - 7, size - 7),
        box(6, 1, size - 7, size - 7)
      )
    case 'cut':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(2, 2, 5, 5),
        box(2, size - 7, 5, 5),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.4,
            top: size * 0.32,
            width: 2,
            height: size * 0.56,
            backgroundColor: color,
          },
        }),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.6,
            top: size * 0.32,
            width: 2,
            height: size * 0.56,
            backgroundColor: color,
          },
        })
      )
    case 'picture':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(2, 3, size - 4, size - 6),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.2,
            top: size * 0.55,
            width: size * 0.28,
            height: size * 0.28,
            backgroundColor: accent,
            borderRadius: 1,
          },
        }),
        jsx('div', {
          style: {
            position: 'absolute',
            right: size * 0.2,
            top: size * 0.4,
            width: size * 0.3,
            height: size * 0.3,
            backgroundColor: office.muted,
          },
        })
      )
    case 'shapes':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(2, size * 0.5, size * 0.38, size * 0.36),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.52,
            top: 3,
            width: size * 0.4,
            height: size * 0.4,
            backgroundColor: accent,
            borderRadius: size * 0.2,
          },
        })
      )
    case 'zoom':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        jsx('div', {
          style: {
            position: 'absolute',
            left: 2,
            top: 2,
            width: size * 0.56,
            height: size * 0.56,
            borderWidth: 1.5,
            borderColor: color,
            borderRadius: size * 0.28,
          },
        }),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.56,
            top: size * 0.62,
            width: size * 0.32,
            height: 2,
            backgroundColor: color,
          },
        })
      )
    case 'save':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(2, 2, size - 4, size - 4),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.28,
            top: 2,
            width: size * 0.44,
            height: size * 0.3,
            backgroundColor: color,
          },
        })
      )
    case 'print':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(2, size * 0.42, size - 4, size * 0.34),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.28,
            top: 2,
            width: size * 0.44,
            height: size * 0.3,
            borderWidth: 1,
            borderColor: color,
          },
        })
      )
    case 'comment':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        box(2, 3, size - 4, size * 0.56),
        jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.25,
            top: size * 0.58,
            width: size * 0.2,
            height: 4,
            backgroundColor: color,
          },
        })
      )
    case 'grid':
      return jsx(
        'div',
        { style: { width: size, height: size, position: 'relative' } },
        ...[
          [2, 2],
          [size * 0.54, 2],
          [2, size * 0.54],
          [size * 0.54, size * 0.54],
        ].map(([left, top], index) =>
          jsx('div', {
            key: index,
            style: {
              position: 'absolute',
              left,
              top,
              width: size * 0.36,
              height: size * 0.36,
              backgroundColor: index === 1 ? accent : color,
              borderRadius: 1,
            },
          })
        )
      )
    default:
      return jsx('span', { style: { width: size, height: size } }, '')
  }
}

export function TitleBar(props: {
  app: string
  initial: string
  file: string
  accent: Accent
  subtitle?: string
}): SceneNode {
  return jsx(
    'div',
    {
      style: {
        height: 32,
        minHeight: 32,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 10,
        paddingRight: 12,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      {
        style: {
          width: 18,
          height: 18,
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: props.accent.main,
        },
      },
      jsx(
        'span',
        { style: { color: '#ffffff', fontSize: 11, fontWeight: 700 } },
        props.initial
      )
    ),
    jsx(
      'span',
      {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: office.ink,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        },
      },
      props.app
    ),
    jsx('span', { style: { color: office.dim, fontSize: 11 } }, '›'),
    jsx(
      'span',
      {
        style: {
          fontSize: 12,
          color: office.ink,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        },
      },
      props.file
    ),
    props.subtitle
      ? jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted, marginLeft: 4 } },
          props.subtitle
        )
      : null,
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'div',
      {
        style: {
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#d9e7f7',
        },
      },
      jsx('span', { style: { fontSize: 9, fontWeight: 700, color: '#185abd' } }, 'DA')
    )
  )
}

export function TabStrip(props: {
  tabs: string[]
  active: string
  onSelect: (tab: string) => void
  accent: Accent
}): SceneNode {
  return jsx(
    'div',
    {
      style: {
        height: 31,
        minHeight: 31,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 1,
        paddingLeft: 10,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    ...props.tabs.map((tab) => {
      const active = tab.toLowerCase() === props.active.toLowerCase()
      const isFile = tab.toLowerCase() === 'file'
      return jsx(
        'div',
        {
          key: tab,
          role: 'tab',
          tabIndex: 0,
          'aria-selected': active ? 'true' : 'false',
          onClick: () => props.onSelect(tab.toLowerCase()),
          style: {
            height: 29,
            paddingLeft: 13,
            paddingRight: 13,
            justifyContent: 'center',
            backgroundColor: isFile && active ? props.accent.main : 'transparent',
            borderColor: isFile && active ? props.accent.main : active ? props.accent.main : 'transparent',
            borderWidth: 1,
            borderRadius: isFile ? 2 : 0,
            marginBottom: isFile ? 1 : 0,
            flexShrink: 0,
          },
        },
        jsx(
          'span',
          {
            style: {
              fontSize: 11.5,
              color: isFile && active ? '#ffffff' : office.ink,
              fontWeight: active && !isFile ? 600 : 400,
              whiteSpace: 'nowrap',
            },
          },
          tab
        )
      )
    })
  )
}

export function RibbonGroup(props: {
  label: string
  children: unknown[]
}): SceneNode {
  return jsx(
    'div',
    {
      style: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 78,
        paddingLeft: 7,
        paddingRight: 7,
        gap: 3,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      {
        style: {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        },
      },
      jsx(
        'div',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            height: 58,
          },
        },
        ...(props.children as SceneNode[])
      ),
      jsx(
        'span',
        {
          style: {
            fontSize: 9.5,
            color: office.muted,
            textAlign: 'center',
          },
        },
        props.label
      )
    )
  )
}

export function BigCommand(props: {
  icon: IconName
  label: string
  onClick?: () => void
  accent: Accent
  active?: boolean
  disabled?: boolean
}): SceneNode {
  return jsx(
    'div',
    {
      role: 'button',
      tabIndex: 0,
      'aria-label': props.label,
      'aria-disabled': props.disabled ? 'true' : 'false',
      onClick: () => {
        if (!props.disabled) props.onClick?.()
      },
      style: {
        width: 58,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: 2,
        borderRadius: 3,
        backgroundColor: props.active ? props.accent.tint : 'transparent',
        borderWidth: 1,
        borderColor: props.active ? props.accent.main : 'transparent',
        opacity: props.disabled ? 0.42 : 1,
      },
    },
    jsx(Icon, {
      name: props.icon,
      accent: props.accent.main,
      size: 22,
    }),
    jsx(
      'span',
      {
        style: {
          fontSize: 9.5,
          color: office.ink,
          textAlign: 'center',
          lineHeight: 11,
        },
      },
      props.label
    )
  )
}

export function SmallCommand(props: {
  icon: IconName
  label?: string
  onClick?: () => void
  accent: Accent
  active?: boolean
  disabled?: boolean
  width?: number
}): SceneNode {
  return jsx(
    'div',
    {
      role: 'button',
      tabIndex: 0,
      'aria-label': props.label,
      'aria-disabled': props.disabled ? 'true' : 'false',
      onClick: () => {
        if (!props.disabled) props.onClick?.()
      },
      style: {
        width: props.width,
        height: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 3,
        paddingRight: 4,
        borderRadius: 3,
        backgroundColor: props.active ? props.accent.tint : 'transparent',
        borderWidth: 1,
        borderColor: props.active ? props.accent.main : 'transparent',
        opacity: props.disabled ? 0.42 : 1,
      },
    },
    jsx(Icon, {
      name: props.icon,
      accent: props.accent.main,
      size: 15,
    }),
    props.label
      ? jsx(
          'span',
          { style: { fontSize: 10, color: office.ink, whiteSpace: 'nowrap' } },
          props.label
        )
      : null
  )
}

export function Ribbon(props: { children: SceneNode[]; accent: Accent }): SceneNode {
  return jsx(
    'div',
    {
      style: {
        height: 82,
        minHeight: 82,
        flexDirection: 'row',
        alignItems: 'stretch',
        paddingLeft: 6,
        paddingTop: 1,
        backgroundColor: office.chromeAlt,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    ...props.children
  )
}

export function StatusBar(props: {
  accent: Accent
  left?: SceneNode | string
  center?: SceneNode | string
  right?: SceneNode | string
}): SceneNode {
  const content = (value: SceneNode | string | undefined): SceneNode => {
    if (value === undefined) return jsx('span', {})
    if (typeof value === 'string') {
      return jsx('span', { style: { color: '#ffffff', fontSize: 10.5 } }, value)
    }
    return value
  }
  return jsx(
    'div',
    {
      style: {
        height: 23,
        minHeight: 23,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        paddingLeft: 12,
        paddingRight: 10,
        backgroundColor: props.accent.main,
      },
    },
    content(props.left),
    jsx('div', { style: { flexGrow: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 18 } },
      content(props.center)
    ),
    content(props.right),
    jsx(
      'div',
      { style: { flexDirection: 'row', alignItems: 'center', gap: 6 } },
      jsx('span', { style: { color: '#ffffff', fontSize: 10.5 } }, '100%'),
      jsx('div', {
        style: {
          width: 52,
          height: 2,
          backgroundColor: '#ffffff66',
          borderRadius: 1,
        },
      }),
      jsx('div', {
        style: {
          width: 5,
          height: 10,
          backgroundColor: '#ffffff',
          borderRadius: 2,
        },
      })
    )
  )
}

export function OfficeApp(props: {
  app: string
  initial: string
  file: string
  accent: Accent
  tabs: string[]
  activeTab: () => string
  onTab: (tab: string) => void
  renderRibbon: (tab: string) => SceneNode
  statusLeft?: SceneNode | string
  statusCenter?: SceneNode | string
  statusRight?: SceneNode | string
  children: SceneNode | SceneNode[]
}): SceneNode {
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        color: office.ink,
        fontSize: 12,
        fontFamily: 'sans-serif',
        minHeight: 0,
      },
    },
    jsx(TitleBar, {
      app: props.app,
      initial: props.initial,
      file: props.file,
      accent: props.accent,
    }),
    dynamic(() =>
      jsx(TabStrip, {
        tabs: props.tabs,
        active: props.activeTab(),
        onSelect: props.onTab,
        accent: props.accent,
      })
    ),
    dynamic(() => props.renderRibbon(props.activeTab())),
    jsx(
      'div',
      {
        style: {
          flexGrow: 1,
          flexDirection: 'column',
          minHeight: 0,
          backgroundColor: office.chrome,
        },
      },
      ...(Array.isArray(props.children) ? props.children : [props.children])
    ),
    jsx(StatusBar, {
      accent: props.accent,
      left: props.statusLeft,
      center: props.statusCenter,
      right: props.statusRight,
    })
  )
}
