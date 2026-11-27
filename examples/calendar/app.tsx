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
import { MONTHS, WEEKDAYS, monthGrid, todayKey } from './date'

interface Event {
  id: string
  date: string
  title: string
  time: string
}

const KEY = 'tardis-ts.calendar'
const today = todayKey()
const seed: Event[] = [
  { id: 'e1', date: today, title: 'Framework review', time: '10:00' },
  { id: 'e2', date: today, title: 'Paint demo', time: '15:30' },
]

function load(): Event[] {
  try {
    const stored = localStorage?.getItem(KEY)
    return stored ? (JSON.parse(stored) as Event[]) : seed
  } catch {
    return seed
  }
}

const now = new Date()
const [year, setYear] = createSignal(now.getFullYear())
const [month, setMonth] = createSignal(now.getMonth())
const [selected, setSelected] = createSignal(today)
const [events, setEvents] = createSignal<Event[]>(load())
const [title, setTitle] = createSignal('')
const [time, setTime] = createSignal('09:00')
const [status, setStatus] = createSignal('Saved locally')

const persist = (next: Event[]): void => {
  setEvents(next)
  try {
    localStorage?.setItem(KEY, JSON.stringify(next))
    setStatus('Saved locally')
  } catch {
    setStatus('Memory only')
  }
}

const shift = (delta: number): void => {
  const next = new Date(year(), month() + delta, 1)
  setYear(next.getFullYear())
  setMonth(next.getMonth())
}

const add = (): void => {
  const value = title().trim()
  if (value === '') return
  persist([
    ...events(),
    { id: `e-${Date.now()}`, date: selected(), title: value, time: time() },
  ])
  setTitle('')
  setStatus('Event added')
}

const remove = (id: string): void => {
  persist(events().filter((event) => event.id !== id))
}

const dayEvents = (date: string): Event[] =>
  events()
    .filter((event) => event.date === date)
    .sort((a, b) => a.time.localeCompare(b.time))

function App(): ReturnType<typeof jsx> {
  const cells = (): ReturnType<typeof monthGrid> => monthGrid(year(), month())
  return jsx(
    Page,
    {
      title: 'Tardis Calendar',
      subtitle: 'Month view with local events',
      actions: [
        jsx(Button, { label: 'Today', onClick: () => {
          const date = new Date()
          setYear(date.getFullYear())
          setMonth(date.getMonth())
          setSelected(todayKey(date))
        } }),
        jsx(Button, { label: 'Previous', onClick: () => shift(-1) }),
        jsx(Button, { label: 'Next', onClick: () => shift(1), primary: true }),
      ],
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 16, flexGrow: 1, alignItems: 'flex-start' } },
      jsx(
        'div',
        {
          style: {
            flexGrow: 1,
            padding: 12,
            gap: 8,
            borderRadius: 10,
            backgroundColor: colors.panel,
            borderWidth: 1,
            borderColor: colors.border,
          },
        },
        jsx(
          'div',
          { style: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 } },
          jsx(
            'span',
            { style: { fontSize: 16, fontWeight: 600, flexGrow: 1, color: colors.text } },
            `${MONTHS[month()]} ${year()}`
          ),
          jsx(Badge, { label: `${events().length} events` })
        ),
        jsx(
          'div',
          { style: { flexDirection: 'row' } },
          ...WEEKDAYS.map((day) =>
            jsx(
              'span',
              {
                key: day,
                style: { width: 130, color: colors.muted, fontSize: 11, padding: 6 },
              },
              day
            )
          )
        ),
        ...Array.from({ length: 6 }, (_, week) =>
          jsx(
            'div',
            { key: week, style: { flexDirection: 'row' } },
            ...cells()
              .slice(week * 7, week * 7 + 7)
              .map((cell) =>
                jsx(
                  'div',
                  {
                    key: cell.date,
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => setSelected(cell.date),
                    style: () => ({
                      width: 130,
                      height: 78,
                      padding: 6,
                      gap: 3,
                      borderWidth: 1,
                      borderColor:
                        cell.date === selected()
                          ? colors.accent
                          : colors.border,
                      backgroundColor:
                        cell.date === today
                          ? '#1f6feb22'
                          : cell.inMonth
                            ? colors.panel2
                            : colors.bg,
                      opacity: cell.inMonth ? 1 : 0.55,
                    }),
                  },
                  jsx(
                    'span',
                    { style: { fontSize: 11, color: colors.muted } },
                    String(cell.day)
                  ),
                  ...dayEvents(cell.date)
                    .slice(0, 2)
                    .map((event) =>
                      jsx(
                        'span',
                        {
                          key: event.id,
                          style: {
                            fontSize: 9,
                            color: colors.text,
                            backgroundColor: '#1f6feb55',
                            borderRadius: 3,
                            paddingLeft: 4,
                            paddingRight: 4,
                          },
                        },
                        `${event.time} ${event.title.slice(0, 12)}`
                      )
                    )
                )
              )
          )
        )
      ),
      jsx(
        Card,
        {
          title: selected(),
          children: [
            jsx(TextField, {
              value: () => title(),
              onChange: setTitle,
              ariaLabel: 'Event title',
              width: 220,
              placeholder: 'Event title',
              onSubmit: add,
            }),
            jsx(
              'div',
              { style: { flexDirection: 'row', gap: 8 } },
              jsx(TextField, {
                value: () => time(),
                onChange: setTime,
                ariaLabel: 'Event time',
                width: 100,
                placeholder: '09:00',
              }),
              jsx(Button, { label: 'Add', onClick: add, primary: true })
            ),
            jsx('div', { style: { height: 1, backgroundColor: colors.border } }),
            ...dayEvents(selected()).map((event) =>
              jsx(
                'div',
                {
                  key: event.id,
                  style: {
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                    padding: 6,
                    borderRadius: 5,
                    backgroundColor: colors.panel2,
                  },
                },
                jsx(Badge, { label: event.time, color: colors.green }),
                jsx('span', { style: { flexGrow: 1, color: colors.text, fontSize: 12 } }, event.title),
                jsx(
                  'span',
                  {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => remove(event.id),
                    style: { color: colors.dim, padding: 2 },
                    'aria-label': `Delete ${event.title}`,
                  },
                  '×'
                )
              )
            ),
            dayEvents(selected()).length === 0
              ? jsx('span', { style: { color: colors.muted, fontSize: 11 } }, 'No events')
              : null,
            jsx('span', { style: { fontSize: 11, color: colors.muted } }, dynamic(() => status()))
          ],
        }
      )
    )
  )
}

render(() => jsx(App))
