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

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company: string
}

const KEY = 'tardis-ts.contacts'
const seed: Contact[] = [
  { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '+44 20 0000', company: 'Analytical Engines' },
  { id: '2', name: 'Grace Hopper', email: 'grace@example.com', phone: '+1 555 0100', company: 'US Navy' },
  { id: '3', name: 'Alan Turing', email: 'alan@example.com', phone: '+44 20 0001', company: 'Bletchley Park' },
]

function load(): Contact[] {
  try {
    const stored = localStorage?.getItem(KEY)
    return stored ? (JSON.parse(stored) as Contact[]) : seed
  } catch {
    return seed
  }
}

const [contacts, setContacts] = createSignal<Contact[]>(load())
const [selectedId, setSelectedId] = createSignal(seed[0]!.id)
const [query, setQuery] = createSignal('')
const [status, setStatus] = createSignal('Saved locally')

const persist = (next: Contact[]): void => {
  setContacts(next)
  try {
    localStorage?.setItem(KEY, JSON.stringify(next))
    setStatus('Saved locally')
  } catch {
    setStatus('Memory only')
  }
}

const selected = (): Contact | undefined =>
  contacts().find((contact) => contact.id === selectedId())

const update = (patch: Partial<Contact>): void => {
  persist(contacts().map((contact) => (contact.id === selectedId() ? { ...contact, ...patch } : contact)))
}

const add = (): void => {
  const contact: Contact = {
    id: `c-${Date.now()}`,
    name: 'New contact',
    email: '',
    phone: '',
    company: '',
  }
  persist([contact, ...contacts()])
  setSelectedId(contact.id)
}

const remove = (id: string): void => {
  const next = contacts().filter((contact) => contact.id !== id)
  persist(next)
  if (next.length > 0) setSelectedId(next[0]!.id)
}

const filtered = (): Contact[] => {
  const text = query().trim().toLowerCase()
  return contacts().filter(
    (contact) =>
      text === '' ||
      contact.name.toLowerCase().includes(text) ||
      contact.email.toLowerCase().includes(text) ||
      contact.company.toLowerCase().includes(text)
  )
}

const exportCsv = (): void => {
  const rows = [
    'name,email,phone,company',
    ...contacts().map((contact) =>
      [contact.name, contact.email, contact.phone, contact.company]
        .map((value) => `"${value.replace(/"/g, '""')}"`)
        .join(',')
    ),
  ]
  if (typeof document !== 'undefined') {
    const anchor = document.createElement('a')
    anchor.href = `data:text/csv;charset=utf-8,${encodeURIComponent(rows.join('\n'))}`
    anchor.download = 'contacts.csv'
    anchor.click()
    setStatus('Exported CSV')
  }
}

function App(): ReturnType<typeof jsx> {
  return jsx(
    Page,
    {
      title: 'Tardis Contacts',
      subtitle: 'Searchable address book with CSV export',
      actions: [
        jsx(Button, { label: 'Export CSV', onClick: exportCsv }),
        jsx(Button, { label: 'New contact', onClick: add, primary: true }),
      ],
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 14, flexGrow: 1, minHeight: 0 } },
      jsx(
        Card,
        {
          title: 'CONTACTS',
          children: [
            jsx(TextField, {
              value: () => query(),
              onChange: setQuery,
              ariaLabel: 'Search contacts',
              width: 240,
              placeholder: 'Search name, email, company',
            }),
            ...filtered().map((contact) =>
              jsx(
                'div',
                {
                  key: contact.id,
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => setSelectedId(contact.id),
                  style: () => ({
                    gap: 4,
                    padding: 8,
                    borderRadius: 6,
                    backgroundColor:
                      contact.id === selectedId() ? '#1f2937' : 'transparent',
                  }),
                },
                jsx('span', { style: { color: colors.text, fontSize: 12 } }, contact.name),
                jsx('span', { style: { color: colors.muted, fontSize: 11 } }, contact.company || contact.email)
              )
            ),
            filtered().length === 0
              ? jsx('span', { style: { color: colors.dim, fontSize: 11 } }, 'No matches')
              : null,
          ],
        }
      ),
      jsx(
        Card,
        {
          title: 'DETAILS',
          grow: true,
          children: [
            dynamic(() => {
              const contact = selected()
              if (!contact) {
                return jsx('span', { style: { color: colors.muted } }, 'Select a contact')
              }
              return [
                jsx(TextField, {
                  key: 'name',
                  value: () => contact.name,
                  onChange: (name) => update({ name }),
                  ariaLabel: 'Name',
                  width: 280,
                }),
                jsx(TextField, {
                  key: 'email',
                  value: () => contact.email,
                  onChange: (email) => update({ email }),
                  ariaLabel: 'Email',
                  width: 280,
                  placeholder: 'email@example.com',
                }),
                jsx(TextField, {
                  key: 'phone',
                  value: () => contact.phone,
                  onChange: (phone) => update({ phone }),
                  ariaLabel: 'Phone',
                  width: 280,
                  placeholder: '+1 555 0100',
                }),
                jsx(TextField, {
                  key: 'company',
                  value: () => contact.company,
                  onChange: (company) => update({ company }),
                  ariaLabel: 'Company',
                  width: 280,
                  placeholder: 'Company',
                }),
                jsx(
                  'div',
                  { style: { flexDirection: 'row', gap: 8, alignItems: 'center' } },
                  jsx(Badge, { label: contact.company || 'independent' }),
                  jsx('div', { style: { flexGrow: 1 } }),
                  jsx(Button, {
                    label: 'Delete',
                    onClick: () => remove(contact.id),
                    danger: true,
                  })
                ),
                jsx('span', { style: { color: colors.muted, fontSize: 11 } }, dynamic(() => status())),
              ]
            }),
          ],
        }
      )
    )
  )
}

render(() => jsx(App))
