import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
  writeClipboard,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

interface Contact {
  id: string
  name: string
  role: string
  email: string
  phone: string
  company: string
}

const ACCENT: Accent = accents.outlook
const STORAGE_KEY = 'tardis-ts.contacts.v2'
const seed: Contact[] = [
  {
    id: '1',
    name: 'Ada Lovelace',
    role: 'Chief Analyst',
    email: 'ada@analytical.example',
    phone: '+44 20 0000 1000',
    company: 'Analytical Engines',
  },
  {
    id: '2',
    name: 'Grace Hopper',
    role: 'Rear Admiral',
    email: 'grace@navy.example',
    phone: '+1 555 0100',
    company: 'US Navy',
  },
  {
    id: '3',
    name: 'Alan Turing',
    role: 'Research Lead',
    email: 'alan@bletchley.example',
    phone: '+44 20 0001 2000',
    company: 'Bletchley Park',
  },
  {
    id: '4',
    name: 'Katherine Johnson',
    role: 'Mathematician',
    email: 'katherine@nasa.example',
    phone: '+1 555 0199',
    company: 'NASA',
  },
]

function load(): Contact[] {
  if (typeof localStorage === 'undefined') return seed
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return seed
    const parsed = JSON.parse(stored) as Contact[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seed
    return parsed.filter(
      (contact) =>
        contact &&
        typeof contact.id === 'string' &&
        typeof contact.name === 'string'
    )
  } catch {
    return seed
  }
}

const [contacts, setContacts] = createSignal<Contact[]>(load())
const [activeId, setActiveId] = createSignal(contacts()[0]!.id)
const [query, setQuery] = createSignal('')
const [status, setStatus] = createSignal('Saved locally')

function active(): Contact {
  return contacts().find((contact) => contact.id === activeId()) ?? contacts()[0]!
}

function persist(next: Contact[], message = 'Saved locally'): void {
  setContacts(next)
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
    setStatus(message)
  } catch {
    setStatus('Memory only')
  }
}

function update(patch: Partial<Contact>): void {
  persist(
    contacts().map((contact) =>
      contact.id === activeId() ? { ...contact, ...patch } : contact
    )
  )
}

function add(): void {
  const contact: Contact = {
    id: `c-${Date.now()}`,
    name: 'New contact',
    role: '',
    email: '',
    phone: '',
    company: '',
  }
  persist([contact, ...contacts()], 'Contact added')
  setActiveId(contact.id)
}

function remove(id: string): void {
  const next = contacts().filter((contact) => contact.id !== id)
  persist(next, 'Contact deleted')
  if (activeId() === id && next.length > 0) setActiveId(next[0]!.id)
}

function filtered(): Contact[] {
  const text = query().trim().toLowerCase()
  if (text === '') return contacts()
  return contacts().filter(
    (contact) =>
      contact.name.toLowerCase().includes(text) ||
      contact.email.toLowerCase().includes(text) ||
      contact.company.toLowerCase().includes(text) ||
      contact.role.toLowerCase().includes(text)
  )
}

function save(): void {
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(contacts()))
    setStatus('Contacts saved to this device')
  } catch {
    setStatus('Save is unavailable in this host')
  }
}

function exportCsv(): void {
  const rows = [
    'name,role,email,phone,company',
    ...contacts().map((contact) =>
      [contact.name, contact.role, contact.email, contact.phone, contact.company]
        .map((value) => `"${value.replace(/"/g, '""')}"`)
        .join(',')
    ),
  ]
  const csv = rows.join('\n')
  writeClipboard(csv)
  if (typeof document !== 'undefined') {
    const anchor = document.createElement('a')
    anchor.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    anchor.download = 'contacts.csv'
    anchor.click()
  }
  setStatus('Exported CSV')
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function avatarColor(name: string): string {
  const palette = ['#0f6cbd', '#107c41', '#c43e1c', '#7030a0', '#0f7b8a']
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % palette.length
  return palette[hash]!
}

function Avatar(props: { name: string; size: number }): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: props.size,
        height: props.size,
        borderRadius: Math.round(props.size / 2),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: avatarColor(props.name),
      },
    },
    jsx(
      'span',
      {
        style: {
          fontSize: Math.round(props.size * 0.34),
          fontWeight: 600,
          color: '#ffffff',
        },
      },
      initials(props.name)
    )
  )
}

function ContactList(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 272,
        minWidth: 272,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { padding: 10, gap: 7 } },
      jsx(
        'div',
        { style: { flexDirection: 'row', alignItems: 'center' } },
        jsx(
          'span',
          { style: { fontSize: 12, fontWeight: 600, color: office.ink, flexGrow: 1 } },
          'People'
        ),
        jsx(
          'span',
          { style: { fontSize: 9.5, color: office.dim } },
          `${filtered().length}`
        )
      ),
      jsx(TextField, {
        value: () => query(),
        onChange: setQuery,
        ariaLabel: 'Search contacts',
        width: 248,
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
        placeholder: 'Search name, company, role',
      })
    ),
    ...filtered().map((contact) =>
      jsx(
        'div',
        {
          key: contact.id,
          role: 'button',
          tabIndex: 0,
          onClick: () => setActiveId(contact.id),
          style: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 7,
            paddingBottom: 7,
            backgroundColor: contact.id === activeId() ? ACCENT.tint : 'transparent',
            borderColor: contact.id === activeId() ? ACCENT.main : 'transparent',
            borderWidth: 1,
          },
        },
        jsx(Avatar, { name: contact.name, size: 30 }),
        jsx(
          'div',
          { style: { flexGrow: 1, gap: 1 } },
          jsx(
            'span',
            { style: { fontSize: 11.5, color: office.ink, fontWeight: 500 } },
            contact.name
          ),
          jsx(
            'span',
            { style: { fontSize: 9.5, color: office.muted } },
            contact.role || contact.company || contact.email
          )
        )
      )
    ),
    filtered().length === 0
      ? jsx(
          'span',
          { style: { fontSize: 10.5, color: office.dim, padding: 12 } },
          'No matching contacts'
        )
      : null
  )
}

function ContactCard(): ReturnType<typeof jsx> {
  const contact = active()
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        padding: 26,
        gap: 12,
        backgroundColor: '#f7f8fa',
        minWidth: 0,
      },
    },
    jsx(
      'div',
      {
        style: {
          padding: 22,
          gap: 14,
          backgroundColor: office.surface,
          borderWidth: 1,
          borderColor: office.border,
        },
      },
      jsx(
        'div',
        { style: { flexDirection: 'row', gap: 16, alignItems: 'center' } },
        jsx(Avatar, { name: contact.name, size: 64 }),
        jsx(
          'div',
          { style: { gap: 2, flexGrow: 1 } },
          jsx(
            'span',
            { style: { fontSize: 23, fontWeight: 600, color: office.ink } },
            contact.name
          ),
          jsx(
            'span',
            { style: { fontSize: 12, color: ACCENT.main } },
            contact.role || 'Contact'
          ),
          jsx(
            'span',
            { style: { fontSize: 11, color: office.muted } },
            contact.company || 'No company'
          )
        )
      ),
      jsx('div', { style: { height: 1, backgroundColor: office.borderSoft } }),
      jsx(
        'div',
        { style: { gap: 7 } },
        jsx(
          'div',
          { style: { flexDirection: 'row', gap: 10 } },
          jsx('span', { style: { fontSize: 9.5, color: office.dim, width: 56 } }, 'EMAIL'),
          jsx(
            'span',
            { style: { fontSize: 12, color: office.ink } },
            contact.email || '—'
          )
        ),
        jsx(
          'div',
          { style: { flexDirection: 'row', gap: 10 } },
          jsx('span', { style: { fontSize: 9.5, color: office.dim, width: 56 } }, 'PHONE'),
          jsx(
            'span',
            { style: { fontSize: 12, color: office.ink } },
            contact.phone || '—'
          )
        ),
        jsx(
          'div',
          { style: { flexDirection: 'row', gap: 10 } },
          jsx('span', { style: { fontSize: 9.5, color: office.dim, width: 56 } }, 'COMPANY'),
          jsx(
            'span',
            { style: { fontSize: 12, color: office.ink } },
            contact.company || '—'
          )
        )
      )
    ),
    jsx(
      'div',
      {
        style: {
          padding: 14,
          gap: 8,
          backgroundColor: office.surface,
          borderWidth: 1,
          borderColor: office.borderSoft,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
        'RECENT ACTIVITY'
      ),
      jsx(
        'span',
        { style: { fontSize: 11, color: office.muted, lineHeight: 16 } },
        `Last edited in this workbook. ${contact.name.split(' ')[0]} is in the Work directory and receives product updates.`
      ),
      jsx(
        'div',
        { style: { flexDirection: 'row', gap: 6, marginTop: 2 } },
        jsx(
          'span',
          {
            style: {
              fontSize: 9.5,
              color: ACCENT.main,
              backgroundColor: ACCENT.tint,
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 2,
              paddingBottom: 2,
              borderRadius: 2,
            },
          },
          'Work'
        ),
        jsx(
          'span',
          {
            style: {
              fontSize: 9.5,
              color: office.muted,
              backgroundColor: office.chrome,
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 2,
              paddingBottom: 2,
              borderRadius: 2,
            },
          },
          'Directory'
        )
      )
    )
  )
}

function Editor(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 250,
        minWidth: 250,
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
      'EDIT CONTACT'
    ),
    ...(
      [
        ['name', 'Name'],
        ['role', 'Role'],
        ['company', 'Company'],
        ['email', 'Email'],
        ['phone', 'Phone'],
      ] as Array<[keyof Contact, string]>
    ).map(([key, label]) =>
      jsx(
        'div',
        { key, style: { gap: 2 } },
        jsx('span', { style: { fontSize: 9, color: office.muted } }, label),
        jsx(TextField, {
          value: () => String(active()[key] ?? ''),
          onChange: (value) => update({ [key]: value } as Partial<Contact>),
          ariaLabel: label,
          width: 226,
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
          placeholder: label,
        })
      )
    ),
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        onClick: () => remove(activeId()),
        style: {
          height: 26,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: office.danger,
          borderRadius: 2,
          marginTop: 4,
        },
      },
      jsx('span', { style: { fontSize: 10.5, color: office.danger } }, 'Delete contact')
    )
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Contacts',
    initial: 'P',
    file: 'Contacts.csv',
    accent: ACCENT,
    toolbar: jsx(Toolbar, {
      accent: ACCENT,
      children: [
        jsx(ToolbarButton, {
          icon: 'plus',
          label: 'New contact',
          accent: ACCENT,
          onClick: add,
        }),
        jsx(ToolbarButton, {
          icon: 'save',
          label: 'Save',
          accent: ACCENT,
          onClick: save,
        }),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(ToolbarButton, {
          icon: 'table',
          label: 'Export CSV',
          accent: ACCENT,
          onClick: exportCsv,
        }),
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
      dynamic(() => `${contacts().length} contacts · ${filtered().length} shown`)
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      'Work directory'
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        dynamic(() => jsx(ContactList, {})),
        dynamic(() => jsx(ContactCard, {})),
        dynamic(() => jsx(Editor, {}))
      ),
    ],
  })
}

render(() => jsx(App))
