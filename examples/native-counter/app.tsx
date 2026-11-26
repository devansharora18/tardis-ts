import { createSignal, render } from '@devansharora18/tardisjs/scene'

const [count, setCount] = createSignal(0)

function App() {
  return (
    <div style={{ padding: 32, gap: 12 }}>
      <h1>Tardis Native</h1>
      <p>Count: {count()}</p>
      <button style={{ width: 200 }} onClick={() => setCount((n) => n + 1)}>
        Increment
      </button>
    </div>
  )
}

render(() => <App />)
