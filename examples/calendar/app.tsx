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
import { MONTHS, WEEKDAYS, monthGrid, todayKey } from './date'

type TagId = 'Work' | 'Personal' | 'Focus'

interface EventItem {
  id: string
  date: string
  title: string
  time: string
  tag: TagId
}

const ACCENT: Accent = accents.outlook
const STORAGE_KEY = 'tardis-ts.calendar.v2'
const TAGS: Array<{ id: TagId; color: string; tint: string }> = [
  { id: 'Work', color: '#0f6cbd', tint: '#deecf9' },
  { id: 'Personal', color: '#107c41', tint: '#e2f0d9' },
  { id: 'Focus', color: '#c43e1c', tint: '#fbe4dc' },
]

const today = todayKey()
const seed: EventItem[] = [
  { id: 'e1', date: today, title: 'Framework review', time: '10:00', tag: 'Work' },
  { id: 'e2', date: today, title: 'Paint demo', time: '15:30', tag: 'Focus' },
  {
    id: 'e3',
    date: todayKey(new Date(new Date().setDate(new Date().getDate() + 2))),
    title: 'Design critique',
    time: '11:00',
    tag: 'Work',
  },
  {
    id: 'e4',
    date: todayKey(new Date(new Date().setDate(new Date().getDate() + 4))),
    title: 'Long run',
    time: '07:30',
    tag: 'Personal',
  },
]

function load(): EventItem[] {
  if (typeof localStorage === 'undefined') return seed
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return seed
    const parsed = JSON.parse(stored) as EventItem[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seed
    return parsed
  } catch {
    return seed
  }
}

const now = new Date()
const [year, setYear] = createSignal(now.getFullYear())
const [month, setMonth] = createSignal(now.getMonth())
const [selected, setSelected] = createSignal(today)
const [events, setEvents] = createSignal<EventItem[]>(load())
const [title, setTitle] = createSignal('')
const [time, setTime] = createSignal('09:00')
const [tag, setTag] = createSignal<TagId>('Work')
const [view, setView] = createSignal<'month' | 'agenda'>('month')
const [status, setStatus] = createSignal('Saved locally')
const [filters, setFilters] = createSignal<Record<TagId, boolean>>({
  Work: true,
  Personal: true,
  Focus: true,
})

function persist(next: EventItem[], message = 'Saved locally'): void {
  setEvents(next)
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
    setStatus(message)
  } catch {
    setStatus('Memory only')
  }
}

function shift(delta: number): void {
  const next = new Date(year(), month() + delta, 1)
  setYear(next.getFullYear())
  setMonth(next.getMonth())
  setStatus(`Showing ${MONTHS[next.getMonth()]} ${next.getFullYear()}`)
}

function goToday(): void {
  const date = new Date()
  setYear(date.getFullYear())
  setMonth(date.getMonth())
  setSelected(todayKey(date))
  setStatus('Today')
}

function visible(event: EventItem): boolean {
  return filters()[event.tag]
}

function filtered(): EventItem[] {
  return events().filter(visible)
}

function add(): void {
  const value = title().trim()
  if (value === '') {
    setStatus('Add a title first')
    return
  }
  persist(
    [
      ...events(),
      { id: `e-${Date.now()}`, date: selected(), title: value, time: time(), tag: tag() },
    ],
    'Event added'
  )
  setTitle('')
}

function remove(id: string): void {
  persist(events().filter((event) => event.id !== id), 'Event deleted')
}

function toggleFilter(id: TagId): void {
  setFilters((current) => ({ ...current, [id]: !current[id] }))
}

function dayEvents(date: string): EventItem[] {
  return filtered()
    .filter((event) => event.date === date)
    .sort((a, b) => a.time.localeCompare(b.time))
}

function tagColor(id: TagId): string {
  return TAGS.find((entry) => entry.id === id)?.color ?? ACCENT.main
}

function tagTint(id: TagId): string {
  return TAGS.find((entry) => entry.id === id)?.tint ?? ACCENT.tint
}

function upcoming(): EventItem[] {
  return [...filtered()]
    .filter((event) => event.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 4)
}

function CalendarPane(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 208,
        minWidth: 208,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { padding: 10, gap: 6 } },
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
        'MY CALENDARS'
      ),
      ...TAGS.map((entry) =>
        jsx(
          'div',
          {
            key: entry.id,
            role: 'button',
            tabIndex: 0,
            onClick: () => toggleFilter(entry.id),
            style: {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              paddingTop: 4,
              paddingBottom: 4,
              opacity: filters()[entry.id] ? 1 : 0.45,
            },
          },
          jsx('div', {
            style: {
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: entry.color,
              borderWidth: 1,
              borderColor: entry.color,
            },
          }),
          jsx(
            'span',
            { style: { fontSize: 11, color: office.ink, flexGrow: 1 } },
            entry.id
          ),
          jsx(
            'span',
            { style: { fontSize: 9.5, color: office.dim } },
            String(events().filter((event) => event.tag === entry.id).length)
          )
        )
      )
    ),
    jsx('div', {
      style: { height: 1, backgroundColor: office.borderSoft, marginLeft: 10, marginRight: 10 },
    }),
    jsx(
      'div',
      { style: { padding: 10, gap: 6 } },
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
        'UPCOMING'
      ),
      ...upcoming().map((event) =>
        jsx(
          'div',
          {
            key: event.id,
            role: 'button',
            tabIndex: 0,
            onClick: () => {
              setSelected(event.date)
              const date = new Date(`${event.date}T00:00:00`)
              setYear(date.getFullYear())
              setMonth(date.getMonth())
              setStatus(event.title)
            },
            style: {
              gap: 1,
              paddingLeft: 6,
              borderColor: tagColor(event.tag),
              borderWidth: 2,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 10, color: office.ink, whiteSpace: 'nowrap' } },
            event.title
          ),
          jsx(
            'span',
            { style: { fontSize: 9, color: office.dim } },
            `${event.date.slice(5)} · ${event.time}`
          )
        )
      ),
      upcoming().length === 0
        ? jsx(
            'span',
            { style: { fontSize: 10, color: office.dim } },
            'Nothing upcoming'
          )
        : null
    )
  )
}

function MonthView(): ReturnType<typeof jsx> {
  const cells = (): ReturnType<typeof monthGrid> => monthGrid(year(), month())
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        flexDirection: 'column',
        backgroundColor: office.surface,
        borderColor: office.border,
        borderWidth: 1,
        minWidth: 0,
      },
    },
    jsx(
      'div',
      {
        style: {
          height: 46,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 14,
          paddingRight: 14,
          gap: 10,
          borderColor: office.borderSoft,
          borderWidth: 1,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 19, fontWeight: 600, color: office.ink } },
        `${MONTHS[month()]} ${year()}`
      ),
      jsx(
        'span',
        { style: { fontSize: 10.5, color: office.muted } },
        `${filtered().length} events`
      ),
      jsx('div', { style: { flexGrow: 1 } }),
      jsx(
        'span',
        { style: { fontSize: 10, color: office.muted } },
        'Month'
      )
    ),
    jsx(
      'div',
      { style: { flexDirection: 'row', height: 26, backgroundColor: office.chrome } },
      ...WEEKDAYS.map((day) =>
        jsx(
          'div',
          {
            key: day,
            style: {
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: office.borderSoft,
              borderWidth: 1,
            },
          },
          jsx('span', { style: { fontSize: 9.5, color: office.muted } }, day)
        )
      )
    ),
    ...Array.from({ length: 6 }, (_, week) =>
      jsx(
        'div',
        { key: week, style: { flexDirection: 'row', flexGrow: 1 } },
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
                  flexGrow: 1,
                  minWidth: 0,
                  padding: 4,
                  gap: 2,
                  borderWidth: 1,
                  borderColor:
                    cell.date === selected() ? ACCENT.main : office.borderSoft,
                  backgroundColor:
                    cell.date === selected()
                      ? ACCENT.tint
                      : cell.date === today
                        ? '#eef6ff'
                        : cell.inMonth
                          ? office.surface
                          : '#f8f8f8',
                  opacity: cell.inMonth ? 1 : 0.55,
                }),
              },
              jsx(
                'div',
                { style: { flexDirection: 'row', alignItems: 'center' } },
                jsx(
                  'span',
                  {
                    style: {
                      fontSize: 10,
                      color:
                        cell.date === today ? ACCENT.main : office.muted,
                      fontWeight: cell.date === today ? 700 : 400,
                      flexGrow: 1,
                    },
                  },
                  String(cell.day)
                ),
                dayEvents(cell.date).length > 2
                  ? jsx(
                      'span',
                      { style: { fontSize: 8, color: office.dim } },
                      `+${dayEvents(cell.date).length - 2}`
                    )
                  : null
              ),
              ...dayEvents(cell.date)
                .slice(0, 2)
                .map((event) =>
                  jsx(
                    'div',
                    {
                      key: event.id,
                      style: {
                        flexDirection: 'row',
                        gap: 3,
                        paddingLeft: 3,
                        paddingRight: 3,
                        paddingTop: 1,
                        paddingBottom: 1,
                        backgroundColor: tagTint(event.tag),
                        borderRadius: 1,
                      },
                    },
                    jsx('div', {
                      style: {
                        width: 4,
                        backgroundColor: tagColor(event.tag),
                      },
                    }),
                    jsx(
                      'span',
                      {
                        style: {
                          fontSize: 8.5,
                          color: tagColor(event.tag),
                          whiteSpace: 'nowrap',
                          flexGrow: 1,
                        },
                      },
                      `${event.time} ${event.title}`
                    )
                  )
                )
            )
          )
      )
    )
  )
}

function AgendaView(): ReturnType<typeof jsx> {
  const grouped = (): Array<{ date: string; items: EventItem[] }> => {
    const map = new Map<string, EventItem[]>()
    for (const event of filtered().sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
    )) {
      const list = map.get(event.date) ?? []
      list.push(event)
      map.set(event.date, list)
    }
    return [...map.entries()].map(([date, items]) => ({ date, items }))
  }
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        padding: 18,
        gap: 10,
        backgroundColor: office.surface,
        borderColor: office.border,
        borderWidth: 1,
        minWidth: 0,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 19, fontWeight: 600, color: office.ink } },
      'Agenda'
    ),
    ...grouped().map((group) =>
      jsx(
        'div',
        { key: group.date, style: { gap: 4 } },
        jsx(
          'span',
          { style: { fontSize: 10, fontWeight: 600, color: ACCENT.main } },
          new Date(`${group.date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
        ),
        ...group.items.map((event) =>
          jsx(
            'div',
            {
              key: event.id,
              role: 'button',
              tabIndex: 0,
              onClick: () => setSelected(group.date),
              style: {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 8,
                borderWidth: 1,
                borderColor: office.borderSoft,
                backgroundColor:
                  group.date === selected() ? ACCENT.tint : office.surface,
              },
            },
            jsx(
              'span',
              { style: { fontSize: 11, color: office.muted, width: 46 } },
              event.time
            ),
            jsx('div', {
              style: {
                width: 3,
                height: 18,
                backgroundColor: tagColor(event.tag),
              },
            }),
            jsx(
              'span',
              { style: { fontSize: 12, color: office.ink, flexGrow: 1 } },
              event.title
            ),
            jsx(
              'span',
              { style: { fontSize: 9.5, color: office.dim } },
              event.tag
            )
          )
        )
      )
    ),
    grouped().length === 0
      ? jsx(
          'span',
          { style: { fontSize: 12, color: office.muted } },
          'No events in the selected calendars'
        )
      : null
  )
}

function Inspector(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 262,
        minWidth: 262,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { padding: 10, gap: 5 } },
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
        'EVENT'
      ),
      jsx(
        'span',
        { style: { fontSize: 13, fontWeight: 600, color: office.ink } },
        new Date(`${selected()}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
      ),
      jsx(TextField, {
        value: () => title(),
        onChange: setTitle,
        onSubmit: add,
        ariaLabel: 'Event title',
        width: 238,
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
        placeholder: 'Event title',
      }),
      jsx(
        'div',
        { style: { flexDirection: 'row', gap: 4 } },
        jsx(TextField, {
          value: () => time(),
          onChange: setTime,
          ariaLabel: 'Event time',
          width: 72,
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
          placeholder: '09:00',
        }),
        jsx(
          'div',
          { style: { flexDirection: 'row', gap: 3, flexGrow: 1 } },
          ...TAGS.map((entry) =>
            jsx(
              'div',
              {
                key: entry.id,
                role: 'button',
                tabIndex: 0,
                onClick: () => setTag(entry.id),
                style: () => ({
                  height: 26,
                  paddingLeft: 7,
                  paddingRight: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tag() === entry.id ? entry.tint : office.surface,
                  borderWidth: 1,
                  borderColor: tag() === entry.id ? entry.color : office.border,
                  borderRadius: 2,
                }),
              },
              jsx(
                'span',
                {
                  style: {
                    fontSize: 9.5,
                    color: tag() === entry.id ? entry.color : office.muted,
                  },
                },
                entry.id
              )
            )
          )
        )
      ),
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: add,
          style: {
            height: 27,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ACCENT.main,
            borderRadius: 2,
          },
        },
        jsx(
          'span',
          { style: { fontSize: 11, color: '#ffffff', fontWeight: 600 } },
          'Add event'
        )
      ),
      jsx('div', { style: { height: 1, backgroundColor: office.borderSoft, marginTop: 4 } }),
      ...dayEvents(selected()).map((event) =>
        jsx(
          'div',
          {
            key: event.id,
            style: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 3 },
          },
          jsx('div', {
            style: {
              width: 3,
              height: 20,
              backgroundColor: tagColor(event.tag),
            },
          }),
          jsx(
            'span',
            { style: { fontSize: 10.5, color: office.muted, width: 36 } },
            event.time
          ),
          jsx(
            'span',
            { style: { fontSize: 11, color: office.ink, flexGrow: 1 } },
            event.title
          ),
          jsx(
            'span',
            {
              role: 'button',
              tabIndex: 0,
              'aria-label': `Delete ${event.title}`,
              onClick: () => remove(event.id),
              style: { fontSize: 12, color: office.dim, padding: 2 },
            },
            '×'
          )
        )
      ),
      dayEvents(selected()).length === 0
        ? jsx(
            'span',
            { style: { fontSize: 10, color: office.dim } },
            'No events on this day'
          )
        : null
    )
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Calendar',
    initial: 'C',
    file: 'Calendar.ics',
    accent: ACCENT,
    toolbar: dynamic(() =>
      jsx(Toolbar, {
        accent: ACCENT,
        children: [
          jsx(ToolbarButton, {
            icon: 'plus',
            label: 'New event',
            accent: ACCENT,
            onClick: () => {
              setTitle('')
              setStatus('Fill in the event title')
            },
          }),
          jsx(ToolbarButton, {
            icon: 'calendar',
            label: 'Today',
            accent: ACCENT,
            onClick: goToday,
          }),
          jsx(ToolbarButton, {
            icon: 'undo',
            label: 'Back',
            accent: ACCENT,
            onClick: () => shift(-1),
          }),
          jsx(ToolbarButton, {
            icon: 'redo',
            label: 'Forward',
            accent: ACCENT,
            onClick: () => shift(1),
          }),
          jsx('div', {
            style: { width: 1, height: 20, backgroundColor: office.borderSoft, marginLeft: 4, marginRight: 4 },
          }),
          jsx(ToolbarButton, {
            icon: 'grid',
            label: 'Month',
            accent: ACCENT,
            active: view() === 'month',
            onClick: () => setView('month'),
          }),
          jsx(ToolbarButton, {
            icon: 'list',
            label: 'Agenda',
            accent: ACCENT,
            active: view() === 'agenda',
            onClick: () => setView('agenda'),
          }),
          jsx('div', { style: { flexGrow: 1 } }),
          jsx(
            'span',
            { style: { fontSize: 10.5, color: office.muted } },
            dynamic(() => `${filtered().length} events visible`)
          ),
        ],
      })
    ),
    statusLeft: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => status())
    ),
    statusCenter: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => `${MONTHS[month()]} ${year()}`)
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      'Work · Personal · Focus'
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        dynamic(() => jsx(CalendarPane, {})),
        jsx(
          'div',
          {
            style: {
              flexGrow: 1,
              flexDirection: 'column',
              padding: 3,
              minWidth: 0,
              backgroundColor: office.chrome,
            },
          },
          dynamic(() =>
            view() === 'month' ? jsx(MonthView, {}) : jsx(AgendaView, {})
          )
        ),
        dynamic(() => jsx(Inspector, {}))
      ),
    ],
  })
}

render(() => jsx(App))
