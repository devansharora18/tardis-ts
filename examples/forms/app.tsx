import '@devansharora18/tardisjs/web'
import {
  Checkbox,
  createForm,
  createSignal,
  FormField,
  render,
  TextField,
} from '@devansharora18/tardisjs/scene'

function App() {
  const [subscribed, setSubscribed] = createSignal(false)
  const form = createForm({
    initial: { name: '', email: '' },
    validate: (values) => {
      const errors: Record<string, string> = {}
      if (!values.name.trim()) errors.name = 'Name is required'
      if (!values.email.includes('@')) errors.email = 'Enter a valid email'
      return errors
    },
    onSubmit: async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    },
  })
  const name = form.field('name')
  const email = form.field('email')

  return (
    <div style={{ padding: 32, gap: 12 }}>
      <h1>Form</h1>
      <p>Tab between fields. Validation runs on blur and submit.</p>
      <FormField label="Name" error={() => name.error()}>
        <TextField
          value={() => name.value()}
          onChange={name.onChange}
          onBlur={name.onBlur}
          placeholder="Ada"
          ariaLabel="Name"
          onSubmit={() => form.submit()}
        />
      </FormField>
      <FormField label="Email" error={() => email.error()}>
        <TextField
          value={() => email.value()}
          onChange={email.onChange}
          onBlur={email.onBlur}
          placeholder="you@example.com"
          ariaLabel="Email"
          width={320}
        />
      </FormField>
      <Checkbox
        checked={() => subscribed()}
        onChange={setSubscribed}
        label="Subscribe"
      />
      <button
        style={{ width: 160 }}
        onClick={() => form.submit()}
      >
        {form.submitting() ? 'Submitting…' : 'Submit'}
      </button>
      <p>
        {form.submitted()
          ? `Submitted ${form.values().name}${
              subscribed() ? ' (subscribed)' : ''
            }`
          : form.submitting()
            ? 'Submitting…'
            : 'Not submitted'}
      </p>
    </div>
  )
}

render(() => <App />)
