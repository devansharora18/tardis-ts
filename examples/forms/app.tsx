import '@devansharora18/tardisjs/web'
import {
  Checkbox,
  createSignal,
  render,
  TextField,
} from '@devansharora18/tardisjs/scene'

function App() {
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [subscribe, setSubscribe] = createSignal(false)
  const [submitted, setSubmitted] = createSignal(false)

  return (
    <div style={{ padding: 32, gap: 12 }}>
      <h1>Form</h1>
      <p>Tab between fields or click them. Enter submits the name field.</p>
      <TextField
        value={() => name()}
        onChange={setName}
        placeholder="Name"
        ariaLabel="Name"
        onSubmit={() => setSubmitted(true)}
      />
      <TextField
        value={() => email()}
        onChange={setEmail}
        placeholder="Email"
        ariaLabel="Email"
        width={320}
      />
      <Checkbox
        checked={() => subscribe()}
        onChange={setSubscribe}
        label="Subscribe"
      />
      <button style={{ width: 160 }} onClick={() => setSubmitted(true)}>
        Submit
      </button>
      <p>
        {submitted()
          ? `Submitted ${name()}${subscribe() ? ' (subscribed)' : ''}`
          : 'Not submitted'}
      </p>
    </div>
  )
}

render(() => <App />)
