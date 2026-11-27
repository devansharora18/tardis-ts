import '@devansharora18/tardis-ts/web'
import {
  createForm,
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
  type SceneEvent,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  DesktopApp,
  Icon,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

interface Values extends Record<string, unknown> {
  name: string
  email: string
  company: string
  role: string
  plan: 'Starter' | 'Team' | 'Enterprise'
  updates: boolean
  terms: boolean
}

const ACCENT: Accent = accents.outlook
const PLANS: Array<{ id: Values['plan']; price: string; seats: string }> = [
  { id: 'Starter', price: '$0', seats: '1 seat' },
  { id: 'Team', price: '$24', seats: '5 seats' },
  { id: 'Enterprise', price: 'Talk', seats: 'Unlimited' },
]
const ROLES = ['Designer', 'Engineer', 'Product', 'Other']

const form = createForm<Values>({
  initial: {
    name: '',
    email: '',
    company: '',
    role: 'Engineer',
    plan: 'Team',
    updates: true,
    terms: false,
  },
  validate: (values) => {
    const errors: Partial<Record<keyof Values, string>> = {}
    if (values.name.trim() === '') errors.name = 'Enter your full name'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
      errors.email = 'Enter a valid work email'
    }
    if (values.company.trim() === '') errors.company = 'Enter your company'
    if (!values.terms) errors.terms = 'Accept the terms to continue'
    return errors
  },
  onSubmit: async () => {
    await new Promise((resolve) => setTimeout(resolve, 650))
  },
})

const [status, setStatus] = createSignal('Ready to submit')

function errorCount(): number {
  return Object.values(form.errors()).filter(Boolean).length
}

function step(): number {
  if (form.values().name === '' || form.values().email === '' || form.values().company === '') {
    return 1
  }
  if (form.values().plan === undefined || !form.values().terms) return 2
  return 3
}

function submitForm(): void {
  setStatus('Checking the form…')
  void form.submit().then(() => {
    setStatus(form.submitted() ? 'Account created' : `${errorCount()} field(s) need attention`)
  })
}

function resetForm(): void {
  form.reset()
  setStatus('Form reset')
}

function Field(props: {
  label: string
  required?: boolean
  error?: () => string | undefined
  width: number
  children?: unknown
}): ReturnType<typeof jsx> {
  return jsx(
    'div',
    { style: { gap: 3, width: props.width } },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 2 } },
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
        props.label
      ),
      props.required
        ? jsx('span', { style: { fontSize: 10, color: office.danger } }, '*')
        : null
    ),
    ...(Array.isArray(props.children) ? props.children : [props.children]),
    dynamic(() => {
      const message = props.error?.()
      return message
        ? jsx(
            'span',
            { style: { fontSize: 9.5, color: office.danger } },
            message
          )
        : null
    })
  )
}

function CheckBox(props: {
  checked: boolean
  label: string
  onChange: (value: boolean) => void
  error?: string
}): ReturnType<typeof jsx> {
  const toggle = (): void => props.onChange(!props.checked)
  return jsx(
    'div',
    { style: { gap: 2 } },
    jsx(
      'div',
      {
        role: 'checkbox',
        tabIndex: 0,
        'aria-checked': props.checked ? 'true' : 'false',
        onPointerDown: toggle,
        onKeyDown: (event: SceneEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault?.()
            toggle()
          }
        },
        style: { flexDirection: 'row', alignItems: 'center', gap: 7 },
      },
      jsx(
        'div',
        {
          style: {
            width: 16,
            height: 16,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: props.checked ? ACCENT.main : office.border,
            backgroundColor: props.checked ? ACCENT.main : office.surface,
            borderRadius: 2,
          },
        },
        props.checked
          ? jsx('span', { style: { fontSize: 11, color: '#ffffff' } }, '✓')
          : null
      ),
      jsx(
        'span',
        { style: { fontSize: 11, color: office.ink, lineHeight: 15 } },
        props.label
      )
    ),
    props.error
      ? jsx('span', { style: { fontSize: 9.5, color: office.danger, marginLeft: 23 } }, props.error)
      : null
  )
}

function Summary(): ReturnType<typeof jsx> {
  const values = form.values()
  return jsx(
    'div',
    {
      style: {
        width: 252,
        minWidth: 252,
        padding: 14,
        gap: 8,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
      'ORDER SUMMARY'
    ),
    jsx(
      'span',
      { style: { fontSize: 17, fontWeight: 600, color: office.ink } },
      dynamic(() => `${(PLANS.find((entry) => entry.id === form.values().plan) ?? PLANS[1]!).price} / month`)
    ),
    jsx(
      'span',
      { style: { fontSize: 10.5, color: office.muted } },
      dynamic(() => {
        const current = PLANS.find((entry) => entry.id === form.values().plan) ?? PLANS[1]!
        return `${current.id} · ${current.seats}`
      })
    ),
    jsx('div', { style: { height: 1, backgroundColor: office.borderSoft, marginTop: 4 } }),
    ...(
      [
        ['Name', values.name || '—'],
        ['Email', values.email || '—'],
        ['Company', values.company || '—'],
        ['Role', values.role],
        ['Updates', values.updates ? 'On' : 'Off'],
      ] as Array<[string, string]>
    ).map(([label, value]) =>
      jsx(
        'div',
        {
          key: label,
          style: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 3,
            paddingBottom: 3,
            borderBottomWidth: 1,
            borderColor: office.borderSoft,
          },
        },
        jsx('span', { style: { fontSize: 9.5, color: office.muted } }, label),
        jsx(
          'span',
          {
            style: {
              fontSize: 10,
              color: office.ink,
              whiteSpace: 'nowrap',
              maxWidth: 150,
            },
          },
          value
        )
      )
    ),
    jsx(
      'div',
      {
        style: {
          padding: 8,
          backgroundColor: ACCENT.tint,
          borderWidth: 1,
          borderColor: '#b8d6f2',
          borderRadius: 2,
          marginTop: 4,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 9.5, color: ACCENT.dark, lineHeight: 14 } },
        'No card required. This demo validates locally and never posts to a server.'
      )
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'span',
      { style: { fontSize: 9, color: office.dim, lineHeight: 13 } },
      'Validation runs on blur and submit; the submit handler is async.'
    )
  )
}

function Steps(): ReturnType<typeof jsx> {
  const labels = ['Profile', 'Preferences', 'Confirm']
  return jsx(
    'div',
    { style: { flexDirection: 'row', alignItems: 'center', gap: 6 } },
    ...labels.map((label, position) =>
      jsx(
        'div',
        { key: label, style: { flexDirection: 'row', alignItems: 'center', gap: 6 } },
        jsx(
          'div',
          {
            style: () => ({
              width: 20,
              height: 20,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                step() > position + 1
                  ? '#107c41'
                  : step() === position + 1
                    ? ACCENT.main
                    : office.chrome,
              borderWidth: 1,
              borderColor:
                step() > position + 1
                  ? '#107c41'
                  : step() === position + 1
                    ? ACCENT.main
                    : office.border,
            }),
          },
          step() > position + 1
            ? jsx('span', { style: { fontSize: 10, color: '#ffffff' } }, '✓')
            : jsx(
                'span',
                {
                  style: {
                    fontSize: 9.5,
                    color: step() === position + 1 ? '#ffffff' : office.muted,
                  },
                },
                String(position + 1)
              )
        ),
        jsx(
          'span',
          { style: { fontSize: 10, color: step() === position + 1 ? office.ink : office.muted } },
          label
        ),
        position < labels.length - 1
          ? jsx('div', {
              style: { width: 26, height: 1, backgroundColor: office.border },
            })
          : null
      )
    )
  )
}

function Success(): ReturnType<typeof jsx> {
  const values = form.values()
  const plan = PLANS.find((entry) => entry.id === values.plan) ?? PLANS[1]!
  return jsx(
    'div',
    {
      style: {
        width: 620,
        padding: 34,
        gap: 12,
        alignItems: 'center',
        backgroundColor: office.surface,
        borderWidth: 1,
        borderColor: office.border,
      },
    },
    jsx(
      'div',
      {
        style: {
          width: 54,
          height: 54,
          borderRadius: 27,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e2f0d9',
          borderWidth: 2,
          borderColor: '#107c41',
        },
      },
      jsx(Icon, { name: 'check', size: 26, color: '#107c41' })
    ),
    jsx(
      'span',
      { style: { fontSize: 24, fontWeight: 600, color: office.ink } },
      `Welcome, ${values.name.split(' ')[0] || 'there'}`
    ),
    jsx(
      'span',
      {
        style: { fontSize: 12, color: office.muted, textAlign: 'center', lineHeight: 18 },
      },
      `Your ${plan.id} workspace for ${values.company} is ready. This demo created it locally; no account was sent to a server.`
    ),
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 8, marginTop: 6 } },
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: resetForm,
          style: {
            height: 30,
            paddingLeft: 14,
            paddingRight: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ACCENT.main,
            borderRadius: 2,
          },
        },
        jsx('span', { style: { fontSize: 11, color: '#ffffff', fontWeight: 600 } }, 'Create another')
      ),
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: () => setStatus('Workspace opened in demo mode'),
          style: {
            height: 30,
            paddingLeft: 14,
            paddingRight: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: office.border,
          },
        },
        jsx('span', { style: { fontSize: 11, color: office.ink } }, 'Open workspace')
      )
    )
  )
}

function FormCard(): ReturnType<typeof jsx> {
  const name = form.field('name')
  const email = form.field('email')
  const company = form.field('company')
  return jsx(
    'div',
    {
      style: {
        width: 620,
        padding: 22,
        gap: 12,
        backgroundColor: office.surface,
        borderWidth: 1,
        borderColor: office.border,
      },
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', alignItems: 'flex-start' } },
      jsx(
        'div',
        { style: { flexGrow: 1, gap: 2 } },
        jsx(
          'span',
          { style: { fontSize: 20, fontWeight: 600, color: office.ink } },
          'Create your workspace'
        ),
        jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted } },
          'Two minutes. No card. Cancel whenever.'
        )
      ),
      dynamic(() => jsx(Steps, {}))
    ),
    dynamic(() =>
      errorCount() > 0 && Object.keys(form.touched()).length > 0
        ? jsx(
            'div',
            {
              style: {
                padding: 8,
                backgroundColor: '#fde7e9',
                borderWidth: 1,
                borderColor: office.danger,
              },
            },
            jsx(
              'span',
              { style: { fontSize: 10.5, color: office.danger } },
              `${errorCount()} field(s) need attention`
            )
          )
        : null
    ),
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 12 } },
      jsx(Field, {
        label: 'Full name',
        required: true,
        width: 280,
        error: () => (form.touched().name ? form.errors().name : undefined),
      }, jsx(TextField, {
        value: () => name.value(),
        onChange: name.onChange,
        onBlur: name.onBlur,
        ariaLabel: 'Full name',
        width: 280,
        height: 30,
        padding: 5,
        lineHeight: 18,
        fontSize: 11.5,
        backgroundColor: office.surface,
        color: office.ink,
        placeholderColor: office.dim,
        selectionColor: ACCENT.tint,
        caretColor: ACCENT.main,
        borderWidth: 1,
        borderColor: () =>
          form.touched().name && form.errors().name
            ? office.danger
            : office.borderStrong,
        borderRadius: 2,
        placeholder: 'Ada Lovelace',
      })),
      jsx(Field, {
        label: 'Work email',
        required: true,
        width: 280,
        error: () => (form.touched().email ? form.errors().email : undefined),
      }, jsx(TextField, {
        value: () => email.value(),
        onChange: email.onChange,
        onBlur: email.onBlur,
        ariaLabel: 'Work email',
        width: 280,
        height: 30,
        padding: 5,
        lineHeight: 18,
        fontSize: 11.5,
        backgroundColor: office.surface,
        color: office.ink,
        placeholderColor: office.dim,
        selectionColor: ACCENT.tint,
        caretColor: ACCENT.main,
        borderWidth: 1,
        borderColor: () =>
          form.touched().email && form.errors().email
            ? office.danger
            : office.borderStrong,
        borderRadius: 2,
        placeholder: 'ada@company.com',
      }))
    ),
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 12 } },
      jsx(Field, {
        label: 'Company',
        required: true,
        width: 280,
        error: () => (form.touched().company ? form.errors().company : undefined),
      }, jsx(TextField, {
        value: () => company.value(),
        onChange: company.onChange,
        onBlur: company.onBlur,
        ariaLabel: 'Company',
        width: 280,
        height: 30,
        padding: 5,
        lineHeight: 18,
        fontSize: 11.5,
        backgroundColor: office.surface,
        color: office.ink,
        placeholderColor: office.dim,
        selectionColor: ACCENT.tint,
        caretColor: ACCENT.main,
        borderWidth: 1,
        borderColor: () =>
          form.touched().company && form.errors().company
            ? office.danger
            : office.borderStrong,
        borderRadius: 2,
        placeholder: 'Analytical Engines',
      })),
      jsx(Field, {
        label: 'Role',
        width: 280,
      }, dynamic(() => jsx(
        'div',
        { style: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' } },
        ...ROLES.map((role) =>
          jsx(
            'div',
            {
              key: role,
              role: 'radio',
              tabIndex: 0,
              'aria-checked': form.values().role === role ? 'true' : 'false',
              onClick: () => form.setValue('role', role),
              style: {
                height: 28,
                paddingLeft: 9,
                paddingRight: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  form.values().role === role ? ACCENT.tint : office.surface,
                borderWidth: 1,
                borderColor:
                  form.values().role === role ? ACCENT.main : office.border,
                borderRadius: 2,
              },
            },
            jsx(
              'span',
              {
                style: {
                  fontSize: 10,
                  color:
                    form.values().role === role ? ACCENT.dark : office.muted,
                },
              },
              role
            )
          )
        )
      )))
    ),
    jsx('div', { style: { height: 1, backgroundColor: office.borderSoft } }),
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
      'PLAN'
    ),
    dynamic(() => jsx(
      'div',
      { style: { flexDirection: 'row', gap: 8 } },
      ...PLANS.map((plan) =>
        jsx(
          'div',
          {
            key: plan.id,
            role: 'radio',
            tabIndex: 0,
            'aria-checked': form.values().plan === plan.id ? 'true' : 'false',
            onClick: () => form.setValue('plan', plan.id),
            style: {
              flexGrow: 1,
              padding: 9,
              gap: 2,
              backgroundColor:
                form.values().plan === plan.id ? ACCENT.tint : office.chromeAlt,
              borderWidth: 1,
              borderColor:
                form.values().plan === plan.id ? ACCENT.main : office.borderSoft,
              borderRadius: 2,
            },
          },
          jsx(
            'div',
            { style: { flexDirection: 'row', alignItems: 'center', gap: 5 } },
            jsx('div', {
              style: {
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor:
                  form.values().plan === plan.id ? ACCENT.main : office.border,
                backgroundColor:
                  form.values().plan === plan.id ? ACCENT.main : office.surface,
              },
            }),
            jsx(
              'span',
              { style: { fontSize: 11, fontWeight: 600, color: office.ink } },
              plan.id
            )
          ),
          jsx(
            'span',
            { style: { fontSize: 14, fontWeight: 600, color: office.ink } },
            plan.price
          ),
          jsx('span', { style: { fontSize: 9, color: office.muted } }, plan.seats)
        )
      )
    )),
    dynamic(() => jsx(CheckBox, {
      checked: form.values().updates,
      label: 'Send me product updates and release notes',
      onChange: (value) => form.setValue('updates', value),
    })),
    dynamic(() => jsx(CheckBox, {
      checked: form.values().terms,
      label: 'I agree to the terms and the privacy policy',
      onChange: (value) => form.setValue('terms', value),
      error: form.touched().terms ? form.errors().terms : undefined,
    })),
    dynamic(() => jsx(
      'div',
      {
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 2,
        },
      },
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: submitForm,
          style: {
            height: 32,
            paddingLeft: 18,
            paddingRight: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: form.submitting() ? office.muted : ACCENT.main,
            borderRadius: 2,
          },
        },
        jsx(
          'span',
          { style: { fontSize: 11.5, color: '#ffffff', fontWeight: 600 } },
          form.submitting() ? 'Creating…' : 'Create workspace'
        )
      ),
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.dim } },
        'No card required'
      )
    ))
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Forms',
    initial: 'F',
    file: 'Account setup',
    accent: ACCENT,
    toolbar: jsx(Toolbar, {
      accent: ACCENT,
      children: [
        jsx(ToolbarButton, {
          icon: 'check',
          label: 'Submit',
          accent: ACCENT,
          onClick: submitForm,
        }),
        jsx(ToolbarButton, {
          icon: 'undo',
          label: 'Reset',
          accent: ACCENT,
          onClick: resetForm,
        }),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted } },
          dynamic(() =>
            Object.keys(form.touched()).length === 0
              ? 'Fill in the form'
              : errorCount() === 0
                ? 'All fields valid'
                : `${errorCount()} issue(s)`
          )
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
      dynamic(() => (form.submitted() ? 'Workspace created' : `Step ${step()} of 3`))
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      'Local validation'
    ),
    children: [
      jsx(
        'div',
        {
          style: {
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 14,
            padding: 18,
            backgroundColor: '#e6e6e6',
            minHeight: 0,
          },
        },
        dynamic(() => (form.submitted() ? jsx(Success, {}) : jsx(FormCard, {}))),
        dynamic(() => jsx(Summary, {}))
      ),
    ],
  })
}

render(() => jsx(App))
