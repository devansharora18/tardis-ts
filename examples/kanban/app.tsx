import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
} from '@devansharora18/tardis-ts/scene'
import { Badge, Button, Card, Page } from '../shared/ui'
import { colors } from '../shared/theme'

interface CardItem {
  id: string
  title: string
  details: string
  tag: string
}

interface Column {
  id: string
  title: string
  cards: CardItem[]
}

const KEY = 'tardis-ts.kanban'
const seed: Column[] = [
  {
    id: 'todo',
    title: 'Backlog',
    cards: [
      { id: 'c1', title: 'Design tokens', details: 'Pick the palette and type scale.', tag: 'design' },
      { id: 'c2', title: 'Docs site', details: 'Write getting started and API reference.', tag: 'docs' },
    ],
  },
  {
    id: 'doing',
    title: 'In progress',
    cards: [
      { id: 'c3', title: 'Native file bridge', details: 'Open and save documents on desktop.', tag: 'core' },
    ],
  },
  {
    id: 'done',
    title: 'Shipped',
    cards: [
      { id: 'c4', title: 'Spreadsheet engine', details: '100k virtualized rows + formulas.', tag: 'app' },
    ],
  },
]

function load(): Column[] {
  try {
    const stored = localStorage?.getItem(KEY)
    return stored ? (JSON.parse(stored) as Column[]) : seed
  } catch {
    return seed
  }
}

const [board, setBoard] = createSignal<Column[]>(load())
const [selectedId, setSelectedId] = createSignal('c1')
const [status, setStatus] = createSignal('Saved locally')
const [query, setQuery] = createSignal('')

const persist = (next: Column[]): void => {
  setBoard(next)
  try {
    localStorage?.setItem(KEY, JSON.stringify(next))
    setStatus('Saved locally')
  } catch {
    setStatus('Memory only')
  }
}

const allCards = (): Array<{ card: CardItem; column: Column }> =>
  board().flatMap((column) => column.cards.map((card) => ({ card, column })))

const selected = (): CardItem | undefined =>
  allCards().find((entry) => entry.card.id === selectedId())?.card

const updateCard = (patch: Partial<CardItem>): void => {
  persist(
    board().map((column) => ({
      ...column,
      cards: column.cards.map((card) =>
        card.id === selectedId() ? { ...card, ...patch } : card
      ),
    }))
  )
}

const addCard = (columnId: string): void => {
  const card: CardItem = {
    id: `card-${Date.now()}`,
    title: 'New card',
    details: 'Double-click fields in the inspector to edit.',
    tag: 'new',
  }
  persist(
    board().map((column) =>
      column.id === columnId ? { ...column, cards: [...column.cards, card] } : column
    )
  )
  setSelectedId(card.id)
}

const removeCard = (id: string): void => {
  persist(
    board().map((column) => ({
      ...column,
      cards: column.cards.filter((card) => card.id !== id),
    }))
  )
}

const move = (id: string, direction: -1 | 1): void => {
  const columns = board()
  const from = columns.findIndex((column) => column.cards.some((card) => card.id === id))
  const to = from + direction
  if (from < 0 || to < 0 || to >= columns.length) return
  const card = columns[from]!.cards.find((entry) => entry.id === id)!
  const next = columns.map((column, index) => {
    if (index === from) {
      return { ...column, cards: column.cards.filter((entry) => entry.id !== id) }
    }
    if (index === to) return { ...column, cards: [...column.cards, card] }
    return column
  })
  persist(next)
}

function App(): ReturnType<typeof jsx> {
  const filtered = (): Column[] => {
    const text = query().trim().toLowerCase()
    if (text === '') return board()
    return board().map((column) => ({
      ...column,
      cards: column.cards.filter(
        (card) =>
          card.title.toLowerCase().includes(text) ||
          card.details.toLowerCase().includes(text) ||
          card.tag.toLowerCase().includes(text)
      ),
    }))
  }

  return jsx(
    Page,
    {
      title: 'Tardis Board',
      subtitle: 'Kanban with local persistence',
      actions: [
        jsx(TextField, {
          value: () => query(),
          onChange: setQuery,
          ariaLabel: 'Filter cards',
          width: 180,
          placeholder: 'Filter cards',
        }),
        jsx(Button, { label: 'New card', onClick: () => addCard('todo'), primary: true }),
      ],
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 14, flexGrow: 1, alignItems: 'flex-start' } },
      ...filtered().map((column) =>
        jsx(
          'div',
          {
            key: column.id,
            style: {
              width: 250,
              padding: 10,
              gap: 8,
              borderRadius: 10,
              backgroundColor: colors.panel,
              borderWidth: 1,
              borderColor: colors.border,
            },
          },
          jsx(
            'div',
            { style: { flexDirection: 'row', alignItems: 'center', gap: 8 } },
            jsx('span', { style: { fontWeight: 600, fontSize: 12, flexGrow: 1 } }, column.title),
            jsx(Badge, { label: String(column.cards.length) }),
            jsx(
              'span',
              {
                role: 'button',
                tabIndex: 0,
                onClick: () => addCard(column.id),
                style: { color: colors.accent, fontSize: 16, paddingLeft: 4, paddingRight: 4 },
              },
              '+'
            )
          ),
          ...column.cards.map((card) =>
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
                  borderRadius: 7,
                  backgroundColor:
                    selectedId() === card.id ? '#1f2937' : colors.panel2,
                  borderWidth: 1,
                  borderColor:
                    selectedId() === card.id ? colors.accent : colors.border,
                }),
              },
              jsx('span', { style: { fontSize: 12, color: colors.text } }, card.title),
              jsx(
                'span',
                { style: { fontSize: 11, color: colors.muted, lineHeight: 16 } },
                card.details
              ),
              jsx(
                'div',
                { style: { flexDirection: 'row', alignItems: 'center', gap: 6 } },
                jsx(Badge, { label: card.tag, color: colors.purple }),
                jsx('div', { style: { flexGrow: 1 } }),
                jsx(
                  'span',
                  {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => move(card.id, -1),
                    style: { color: colors.dim, padding: 3 },
                    'aria-label': 'Move left',
                  },
                  '←'
                ),
                jsx(
                  'span',
                  {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => move(card.id, 1),
                    style: { color: colors.dim, padding: 3 },
                    'aria-label': 'Move right',
                  },
                  '→'
                )
              )
            )
          )
        )
      ),
      jsx(
        Card,
        {
          title: 'INSPECTOR',
          grow: true,
          children: [
            dynamic(() => {
              const card = selected()
              if (!card) {
                return jsx('span', { style: { color: colors.muted } }, 'Select a card')
              }
              const location = allCards().find((entry) => entry.card.id === card.id)?.column
              return [
                jsx(TextField, {
                  key: 'title',
                  value: () => card.title,
                  onChange: (title) => updateCard({ title }),
                  ariaLabel: 'Card title',
                  width: 260,
                }),
                jsx(TextField, {
                  key: 'details',
                  value: () => card.details,
                  onChange: (details) => updateCard({ details }),
                  ariaLabel: 'Card details',
                  multiline: true,
                  rows: 4,
                  width: 260,
                }),
                jsx(TextField, {
                  key: 'tag',
                  value: () => card.tag,
                  onChange: (tag) => updateCard({ tag }),
                  ariaLabel: 'Card tag',
                  width: 120,
                }),
                jsx('span', { style: { color: colors.muted, fontSize: 11 } }, `Column: ${location?.title}`),
                jsx(
                  'div',
                  { style: { flexDirection: 'row', gap: 8 } },
                  jsx(Button, { label: '← Move', onClick: () => move(card.id, -1) }),
                  jsx(Button, { label: 'Move →', onClick: () => move(card.id, 1) }),
                  jsx(Button, {
                    label: 'Delete',
                    onClick: () => removeCard(card.id),
                    danger: true,
                  })
                ),
              ]
            }),
          ],
        }
      )
    ),
    jsx('div', { style: { color: colors.muted, fontSize: 11 } }, dynamic(() => status()))
  )
}

render(() => jsx(App))
