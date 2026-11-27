import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

interface CardItem {
  id: string
  title: string
  details: string
  tag: string
  owner: string
  priority: 'High' | 'Normal' | 'Low'
}

interface Column {
  id: string
  title: string
  color: string
  cards: CardItem[]
}

const ACCENT: Accent = accents.outlook
const STORAGE_KEY = 'tardis-ts.kanban.v2'
const seed: Column[] = [
  {
    id: 'todo',
    title: 'Backlog',
    color: '#8a8886',
    cards: [
      {
        id: 'c1',
        title: 'Design tokens',
        details: 'Pick the palette and type scale for the office examples.',
        tag: 'design',
        owner: 'Dana',
        priority: 'Normal',
      },
      {
        id: 'c2',
        title: 'Docs site',
        details: 'Write getting started and the API reference.',
        tag: 'docs',
        owner: 'Miles',
        priority: 'Low',
      },
    ],
  },
  {
    id: 'doing',
    title: 'In progress',
    color: '#0f6cbd',
    cards: [
      {
        id: 'c3',
        title: 'Native file bridge',
        details: 'Open and save documents on desktop.',
        tag: 'core',
        owner: 'Rae',
        priority: 'High',
      },
      {
        id: 'c4',
        title: 'Ribbon polish',
        details: 'Tighten the command groups at 1280 px.',
        tag: 'design',
        owner: 'Noah',
        priority: 'Normal',
      },
    ],
  },
  {
    id: 'done',
    title: 'Shipped',
    color: '#107c41',
    cards: [
      {
        id: 'c5',
        title: 'Spreadsheet engine',
        details: '100k virtualized rows and formulas.',
        tag: 'app',
        owner: 'Iris',
        priority: 'Normal',
      },
      {
        id: 'c6',
        title: 'Word page canvas',
        details: 'Rulers, tables, and a source pane.',
        tag: 'app',
        owner: 'Dana',
        priority: 'Normal',
      },
    ],
  },
]

function load(): Column[] {
  if (typeof localStorage === 'undefined') return seed
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return seed
    const parsed = JSON.parse(stored) as Column[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seed
    return parsed
  } catch {
    return seed
  }
}

const [board, setBoard] = createSignal<Column[]>(load())
const [selectedId, setSelectedId] = createSignal('c1')
const [query, setQuery] = createSignal('')
const [status, setStatus] = createSignal('Saved locally')

function persist(next: Column[], message = 'Saved locally'): void {
  setBoard(next)
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
    setStatus(message)
  } catch {
    setStatus('Memory only')
  }
}

function allCards(): Array<{ card: CardItem; column: Column }> {
  return board().flatMap((column) =>
    column.cards.map((card) => ({ card, column }))
  )
}

function updateCard(patch: Partial<CardItem>): void {
  persist(
    board().map((column) => ({
      ...column,
      cards: column.cards.map((card) =>
        card.id === selectedId() ? { ...card, ...patch } : card
      ),
    }))
  )
}

function addCard(columnId: string): void {
  const card: CardItem = {
    id: `card-${Date.now()}`,
    title: 'New card',
    details: 'Add the outcome and the next action.',
    tag: 'new',
    owner: 'Dana',
    priority: 'Normal',
  }
  persist(
    board().map((column) =>
      column.id === columnId
        ? { ...column, cards: [...column.cards, card] }
        : column
    ),
    'Card added'
  )
  setSelectedId(card.id)
}

function removeCard(id: string): void {
  const next = board().map((column) => ({
    ...column,
    cards: column.cards.filter((card) => card.id !== id),
  }))
  persist(next, 'Card deleted')
  if (selectedId() === id) {
    setSelectedId(next.flatMap((column) => column.cards)[0]?.id ?? '')
  }
}

function move(id: string, direction: -1 | 1): void {
  const columns = board()
  const from = columns.findIndex((column) =>
    column.cards.some((card) => card.id === id)
  )
  const to = from + direction
  if (from < 0 || to < 0 || to >= columns.length) return
  const card = columns[from]!.cards.find((entry) => entry.id === id)!
  const next = columns.map((column, index) => {
    if (index === from) {
      return {
        ...column,
        cards: column.cards.filter((entry) => entry.id !== id),
      }
    }
    if (index === to) return { ...column, cards: [...column.cards, card] }
    return column
  })
  persist(next, direction < 0 ? 'Moved card left' : 'Moved card right')
}

function save(): void {
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(board()))
    setStatus('Board saved to this device')
  } catch {
    setStatus('Save is unavailable in this host')
  }
}

function filtered(): Column[] {
  const text = query().trim().toLowerCase()
  if (text === '') return board()
  return board().map((column) => ({
    ...column,
    cards: column.cards.filter(
      (card) =>
        card.title.toLowerCase().includes(text) ||
        card.details.toLowerCase().includes(text) ||
        card.tag.toLowerCase().includes(text) ||
        card.owner.toLowerCase().includes(text)
    ),
  }))
}

function priorityColor(priority: CardItem['priority']): string {
  return priority === 'High'
    ? '#a4262c'
    : priority === 'Low'
      ? '#6b7280'
      : '#8a6d00'
}

function priorityTint(priority: CardItem['priority']): string {
  return priority === 'High'
    ? '#fde7e9'
    : priority === 'Low'
      ? '#f3f2f1'
      : '#fff4ce'
}

function BoardHeader(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        height: 62,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingLeft: 18,
        paddingRight: 18,
        backgroundColor: office.surface,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { gap: 2 } },
      jsx(
        'span',
        { style: { fontSize: 18, fontWeight: 600, color: office.ink } },
        'Q4 launch'
      ),
      jsx(
        'span',
        { style: { fontSize: 10.5, color: office.muted } },
        `${allCards().length} cards · 3 columns · local board`
      )
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(TextField, {
      value: () => query(),
      onChange: setQuery,
      ariaLabel: 'Filter cards',
      width: 220,
      height: 27,
      padding: 4,
      lineHeight: 16,
      fontSize: 11,
      backgroundColor: office.chromeAlt,
      color: office.ink,
      placeholderColor: office.dim,
      selectionColor: ACCENT.tint,
      caretColor: ACCENT.main,
      borderWidth: 1,
      borderColor: office.border,
      borderRadius: 2,
      placeholder: 'Filter cards',
    }),
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 0 } },
      ...['DA', 'MI', 'RA'].map((name, index) =>
        jsx(
          'div',
          {
            key: name,
            style: {
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ['#0f6cbd', '#107c41', '#c43e1c'][index],
              borderWidth: 2,
              borderColor: office.surface,
              marginLeft: index === 0 ? 0 : -6,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 8.5, color: '#ffffff', fontWeight: 600 } },
            name
          )
        )
      )
    )
  )
}

function BoardColumn(props: { column: Column }): ReturnType<typeof jsx> {
  const cards = (): CardItem[] =>
    filtered().find((column) => column.id === props.column.id)?.cards ?? []
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        minWidth: 240,
        flexDirection: 'column',
        gap: 6,
        padding: 8,
        backgroundColor: '#f3f2f1',
        borderWidth: 1,
        borderColor: office.borderSoft,
      },
    },
    jsx(
      'div',
      {
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 2,
          paddingBottom: 4,
        },
      },
      jsx('div', {
        style: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: props.column.color,
        },
      }),
      jsx(
        'span',
        { style: { fontSize: 11, fontWeight: 600, color: office.ink, flexGrow: 1 } },
        props.column.title
      ),
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.dim } },
        String(cards().length)
      ),
      jsx(
        'span',
        {
          role: 'button',
          tabIndex: 0,
          onClick: () => addCard(props.column.id),
          style: { fontSize: 14, color: ACCENT.main, paddingLeft: 4, paddingRight: 4 },
        },
        '+'
      )
    ),
    ...cards().map((card) =>
      jsx(
        'div',
        {
          key: card.id,
          role: 'button',
          tabIndex: 0,
          onClick: () => setSelectedId(card.id),
          style: () => ({
            padding: 9,
            gap: 6,
            backgroundColor: office.surface,
            borderWidth: 1,
            borderColor: selectedId() === card.id ? ACCENT.main : office.border,
            borderLeftWidth: selectedId() === card.id ? 3 : 1,
            borderLeftColor:
              selectedId() === card.id ? ACCENT.main : office.border,
            borderRadius: 2,
          }),
        },
        jsx(
          'span',
          { style: { fontSize: 11.5, color: office.ink, fontWeight: 500 } },
          card.title
        ),
        jsx(
          'span',
          {
            style: { fontSize: 10, color: office.muted, lineHeight: 14 },
          },
          card.details
        ),
        jsx(
          'div',
          { style: { flexDirection: 'row', alignItems: 'center', gap: 4 } },
          jsx(
            'span',
            {
              style: {
                fontSize: 8.5,
                color: ACCENT.main,
                backgroundColor: ACCENT.tint,
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 1,
                paddingBottom: 1,
                borderRadius: 2,
              },
            },
            card.tag
          ),
          jsx(
            'span',
            {
              style: {
                fontSize: 8.5,
                color: priorityColor(card.priority),
                backgroundColor: priorityTint(card.priority),
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 1,
                paddingBottom: 1,
                borderRadius: 2,
              },
            },
            card.priority
          ),
          jsx('div', { style: { flexGrow: 1 } }),
          jsx(
            'span',
            { style: { fontSize: 8.5, color: office.dim } },
            card.owner
          )
        )
      )
    ),
    cards().length === 0
      ? jsx(
          'div',
          {
            style: {
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: office.borderSoft,
              backgroundColor: office.chrome,
            },
          },
          jsx('span', { style: { fontSize: 10, color: office.dim } }, 'No cards')
        )
      : null,
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        onClick: () => addCard(props.column.id),
        style: {
          height: 26,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: office.borderSoft,
          backgroundColor: office.chrome,
        },
      },
      jsx('span', { style: { fontSize: 10, color: office.muted } }, '+ Add card')
    )
  )
}

function Inspector(): ReturnType<typeof jsx> {
  const cardId = selectedId()
  const card = (): CardItem | undefined =>
    allCards().find((entry) => entry.card.id === cardId)?.card
  const column = (): Column | undefined =>
    allCards().find((entry) => entry.card.id === cardId)?.column
  return jsx(
    'div',
    {
      style: {
        width: 252,
        minWidth: 252,
        padding: 10,
        gap: 6,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
      'CARD'
    ),
    cardId !== ''
      ? jsx(
          'div',
          { style: { gap: 6 } },
          jsx(TextField, {
            value: () => card()?.title ?? '',
            onChange: (title) => updateCard({ title }),
            ariaLabel: 'Card title',
            width: 228,
            height: 26,
            padding: 4,
            lineHeight: 16,
            fontSize: 11,
            backgroundColor: office.surface,
            color: office.ink,
            placeholderColor: office.dim,
            selectionColor: ACCENT.tint,
            caretColor: ACCENT.main,
            borderWidth: 1,
            borderColor: office.border,
            borderRadius: 2,
          }),
          jsx(TextField, {
            value: () => card()?.details ?? '',
            onChange: (details) => updateCard({ details }),
            ariaLabel: 'Card details',
            multiline: true,
            rows: 5,
            width: 228,
            padding: 5,
            lineHeight: 16,
            fontSize: 11,
            backgroundColor: office.surface,
            color: office.ink,
            placeholderColor: office.dim,
            selectionColor: ACCENT.tint,
            caretColor: ACCENT.main,
            borderWidth: 1,
            borderColor: office.border,
            borderRadius: 2,
          }),
          jsx(TextField, {
            value: () => card()?.tag ?? '',
            onChange: (tag) => updateCard({ tag }),
            ariaLabel: 'Card tag',
            width: 120,
            height: 26,
            padding: 4,
            lineHeight: 16,
            fontSize: 11,
            backgroundColor: office.surface,
            color: office.ink,
            placeholderColor: office.dim,
            selectionColor: ACCENT.tint,
            caretColor: ACCENT.main,
            borderWidth: 1,
            borderColor: office.border,
            borderRadius: 2,
          }),
          dynamic(() =>
            jsx(
              'span',
              { style: { fontSize: 10, color: office.muted } },
              `Column: ${column()?.title ?? '—'}`
            )
          ),
          dynamic(() => {
            const current = card()
            if (!current) return null
            return jsx(
              'div',
              { style: { flexDirection: 'row', gap: 4 } },
              ...[
                ['High', '#fde7e9', '#a4262c'],
                ['Normal', '#fff4ce', '#8a6d00'],
                ['Low', '#f3f2f1', '#6b7280'],
              ].map(([value, tint, color]) =>
                jsx(
                  'div',
                  {
                    key: value,
                    role: 'button',
                    tabIndex: 0,
                    onClick: () =>
                      updateCard({ priority: value as CardItem['priority'] }),
                    style: {
                      height: 22,
                      paddingLeft: 7,
                      paddingRight: 7,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: tint,
                      borderWidth: 1,
                      borderColor:
                        current.priority === value ? color : office.borderSoft,
                      borderRadius: 2,
                    },
                  },
                  jsx('span', { style: { fontSize: 9, color } }, value)
                )
              )
            )
          }),
          jsx(
            'div',
            { style: { flexDirection: 'row', gap: 3 } },
            jsx(ToolbarButton, {
              icon: 'undo',
              label: 'Move left',
              accent: ACCENT,
              onClick: () => move(cardId, -1),
              width: 102,
            }),
            jsx(ToolbarButton, {
              icon: 'redo',
              label: 'Move right',
              accent: ACCENT,
              onClick: () => move(cardId, 1),
              width: 104,
            })
          ),
          jsx(
            'div',
            {
              role: 'button',
              tabIndex: 0,
              onClick: () => removeCard(cardId),
              style: {
                height: 25,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: office.danger,
                borderRadius: 2,
                marginTop: 2,
              },
            },
            jsx(
              'span',
              { style: { fontSize: 10, color: office.danger } },
              'Delete card'
            )
          )
        )
      : jsx(
          'span',
          { style: { fontSize: 11, color: office.muted } },
          'Select a card'
        ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'span',
      { style: { fontSize: 9.5, color: office.muted, lineHeight: 14 } },
      'Cards persist in the native and web hosts through the same storage bridge.'
    )
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Board',
    initial: 'B',
    file: 'Q4 launch.board',
    accent: ACCENT,
    toolbar: jsx(Toolbar, {
      accent: ACCENT,
      children: [
        jsx(ToolbarButton, {
          icon: 'plus',
          label: 'New card',
          accent: ACCENT,
          onClick: () => addCard('todo'),
        }),
        jsx(ToolbarButton, {
          icon: 'save',
          label: 'Save',
          accent: ACCENT,
          onClick: save,
        }),
        jsx('div', {
          style: { width: 1, height: 20, backgroundColor: office.borderSoft, marginLeft: 4, marginRight: 4 },
        }),
        jsx(ToolbarButton, {
          icon: 'grid',
          label: 'Board',
          accent: ACCENT,
          active: true,
        }),
        jsx(ToolbarButton, {
          icon: 'list',
          label: 'My cards',
          accent: ACCENT,
          active: false,
          onClick: () => setStatus('All cards are visible on the board'),
        }),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted } },
          dynamic(() => `${allCards().length} cards`)
        ),
      ],
    }),
    statusLeft: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => status())
    ),
    statusCenter: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => `${allCards().length} cards · ${board().length} columns`)
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      'Q4 launch'
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'column', minHeight: 0 } },
        dynamic(() => jsx(BoardHeader, {})),
        jsx(
          'div',
          {
            style: {
              flexGrow: 1,
              flexDirection: 'row',
              gap: 10,
              padding: 12,
              backgroundColor: '#e6e6e6',
              minHeight: 0,
            },
          },
          dynamic(() =>
            filtered().map((column) =>
              jsx(BoardColumn, { key: column.id, column })
            )
          ),
          dynamic(() => jsx(Inspector, {}))
        )
      ),
    ],
  })
}

render(() => jsx(App))
