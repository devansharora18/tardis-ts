import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
  VirtualList,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

interface Person {
  id: number
  name: string
  email: string
  department: string
  location: string
  status: 'Active' | 'Away' | 'Offline'
}

const ACCENT: Accent = accents.outlook
const TOTAL = 10_000
const FIRST = ['Ada', 'Grace', 'Alan', 'Katherine', 'Linus', 'Margaret', 'Dennis', 'Barbara', 'Ken', 'Frances']
const LAST = ['Lovelace', 'Hopper', 'Turing', 'Johnson', 'Torvalds', 'Hamilton', 'Ritchie', 'Liskov', 'Thompson', 'Allen']
const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Finance', 'Support', 'Sales']
const LOCATIONS = ['San Francisco', 'London', 'Berlin', 'Tokyo', 'New York', 'Remote']
const STATUSES: Person['status'][] = ['Active', 'Active', 'Away', 'Active', 'Offline', 'Active']

const people: Person[] = Array.from({ length: TOTAL }, (_, index) => {
  const first = FIRST[index % FIRST.length]!
  const last = LAST[(index * 7) % LAST.length]!
  return {
    id: index + 1,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${index + 1}@example.com`,
    department: DEPARTMENTS[index % DEPARTMENTS.length]!,
    location: LOCATIONS[(index * 3) % LOCATIONS.length]!,
    status: STATUSES[index % STATUSES.length]!,
  }
})

const [query, setQuery] = createSignal('')
const [selected, setSelected] = createSignal<number | null>(0)
const [status, setStatus] = createSignal('10,000 virtual rows')
const [viewportH, setViewportH] = createSignal(
  typeof window !== 'undefined' ? window.innerHeight : 800
)

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => setViewportH(window.innerHeight))
}

function filtered(): Person[] {
  const text = query().trim().toLowerCase()
  if (text === '') return people
  return people.filter(
    (person) =>
      person.name.toLowerCase().includes(text) ||
      person.email.toLowerCase().includes(text) ||
      person.department.toLowerCase().includes(text) ||
      person.location.toLowerCase().includes(text)
  )
}

function selectedPerson(): Person | undefined {
  const index = selected()
  return index === null ? undefined : people[index]
}

function statusColor(value: Person['status']): string {
  return value === 'Active' ? '#107c41' : value === 'Away' ? '#8a6d00' : '#8a8886'
}

function statusTint(value: Person['status']): string {
  return value === 'Active' ? '#e2f0d9' : value === 'Away' ? '#fff4ce' : '#f3f2f1'
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
}

function Row(props: { person: Person; position: number }): ReturnType<typeof jsx> {
  const { person, position } = props
  return jsx(
    'div',
    {
      role: 'row',
      tabIndex: 0,
      onClick: () => setSelected(position),
      style: () => ({
        height: 36,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor:
          selected() === position
            ? ACCENT.tint
            : position % 2 === 0
              ? office.surface
              : '#fafafa',
        borderColor: selected() === position ? ACCENT.main : office.borderSoft,
        borderWidth: 1,
      }),
    },
    jsx(
      'div',
      { style: { width: 280, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 10 } },
      jsx(
        'div',
        {
          style: {
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#deecf9',
          },
        },
        jsx(
          'span',
          { style: { fontSize: 8, fontWeight: 700, color: ACCENT.dark } },
          initials(person.name)
        )
      ),
      jsx(
        'span',
        { style: { fontSize: 11.5, color: office.ink, whiteSpace: 'nowrap' } },
        person.name
      )
    ),
    jsx(
      'span',
      { style: { width: 330, fontSize: 10.5, color: office.muted, paddingLeft: 4 } },
      person.email
    ),
    jsx(
      'span',
      { style: { width: 150, fontSize: 10.5, color: office.ink } },
      person.department
    ),
    jsx(
      'span',
      { style: { width: 150, fontSize: 10.5, color: office.muted } },
      person.location
    ),
    jsx(
      'div',
      { style: { width: 108, flexDirection: 'row' } },
      jsx(
        'span',
        {
          style: {
            fontSize: 8.5,
            color: statusColor(person.status),
            backgroundColor: statusTint(person.status),
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: 2,
          },
        },
        person.status
      )
    )
  )
}

function Inspector(): ReturnType<typeof jsx> {
  const person = selectedPerson()
  return jsx(
    'div',
    {
      style: {
        width: 260,
        minWidth: 260,
        padding: 12,
        gap: 7,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
      'RECORD'
    ),
    person
      ? jsx(
          'div',
          { style: { gap: 8 } },
          jsx(
            'div',
            { style: { flexDirection: 'row', alignItems: 'center', gap: 10 } },
            jsx(
              'div',
              {
                style: {
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#deecf9',
                },
              },
              jsx(
                'span',
                { style: { fontSize: 13, fontWeight: 700, color: ACCENT.dark } },
                initials(person.name)
              )
            ),
            jsx(
              'div',
              { style: { gap: 1 } },
              jsx(
                'span',
                { style: { fontSize: 13, fontWeight: 600, color: office.ink } },
                person.name
              ),
              jsx(
                'span',
                { style: { fontSize: 10, color: office.muted } },
                person.email
              )
            )
          ),
          ...(
            [
              ['Department', person.department],
              ['Location', person.location],
              ['Status', person.status],
              ['Record', `#${person.id}`],
            ] as Array<[string, string]>
          ).map(([label, value]) =>
            jsx(
              'div',
              {
                key: label,
                style: {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  borderBottomWidth: 1,
                  borderColor: office.borderSoft,
                  paddingTop: 4,
                  paddingBottom: 4,
                },
              },
              jsx('span', { style: { fontSize: 10, color: office.muted } }, label),
              jsx('span', { style: { fontSize: 10.5, color: office.ink } }, value)
            )
          ),
          jsx(
            'div',
            {
              role: 'button',
              tabIndex: 0,
              onClick: () => setStatus(`Message queued for ${person.name}`),
              style: {
                height: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: ACCENT.main,
                borderRadius: 2,
                marginTop: 4,
              },
            },
            jsx(
              'span',
              { style: { fontSize: 10.5, color: '#ffffff', fontWeight: 600 } },
              'Message'
            )
          )
        )
      : jsx(
          'span',
          { style: { fontSize: 11, color: office.muted } },
          'Select a row'
        ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'span',
      { style: { fontSize: 9, color: office.dim, lineHeight: 13 } },
      'Only the visible window is mounted. Scroll to traverse 10,000 records.'
    )
  )
}

function App(): ReturnType<typeof jsx> {
  const rows = (): Person[] => filtered()
  return jsx(DesktopApp, {
    app: 'Tardis Directory',
    initial: 'D',
    file: '10,000 people.csv',
    accent: ACCENT,
    toolbar: jsx(Toolbar, {
      accent: ACCENT,
      children: [
        jsx(TextField, {
          value: () => query(),
          onChange: setQuery,
          ariaLabel: 'Search directory',
          width: 300,
          height: 27,
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
          placeholder: 'Search name, email, department, location',
        }),
        jsx(ToolbarButton, {
          icon: 'close',
          label: 'Clear',
          accent: ACCENT,
          onClick: () => {
            setQuery('')
            setStatus('Showing all records')
          },
        }),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted } },
          dynamic(() => `${rows().length.toLocaleString()} matches`)
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
      dynamic(() => `${TOTAL.toLocaleString()} records · ${rows().length.toLocaleString()} shown`)
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      'VirtualList'
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        jsx(
          'div',
          {
            style: {
              flexGrow: 1,
              flexDirection: 'column',
              minWidth: 0,
              backgroundColor: office.surface,
            },
          },
          jsx(
            'div',
            {
              style: {
                height: 30,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: office.chrome,
                borderColor: office.borderSoft,
                borderWidth: 1,
              },
            },
            jsx(
              'span',
              { style: { width: 280, paddingLeft: 10, fontSize: 9.5, fontWeight: 600, color: office.muted } },
              'NAME'
            ),
            jsx(
              'span',
              { style: { width: 330, fontSize: 9.5, fontWeight: 600, color: office.muted } },
              'EMAIL'
            ),
            jsx(
              'span',
              { style: { width: 150, fontSize: 9.5, fontWeight: 600, color: office.muted } },
              'DEPARTMENT'
            ),
            jsx(
              'span',
              { style: { width: 150, fontSize: 9.5, fontWeight: 600, color: office.muted } },
              'LOCATION'
            ),
            jsx(
              'span',
              { style: { width: 108, fontSize: 9.5, fontWeight: 600, color: office.muted } },
              'STATUS'
            )
          ),
          jsx(VirtualList, {
            items: rows,
            rowHeight: 36,
            height: Math.max(320, viewportH() - 124),
            overscan: 4,
            renderRow: (person: Person, position: number) =>
              jsx(Row, { key: person.id, person, position }),
          })
        ),
        dynamic(() => jsx(Inspector, {}))
      ),
    ],
  })
}

render(() => jsx(App))
