import '@devansharora18/tardisjs/web'
import { render, VirtualList } from '@devansharora18/tardisjs/scene'

const rows = Array.from({ length: 10_000 }, (_, index) => `Row ${index}`)

function App() {
  return (
    <div style={{ padding: 16, gap: 8 }}>
      <h1>10,000 rows</h1>
      <VirtualList
        items={() => rows}
        rowHeight={40}
        height={600}
        renderRow={(row, index) => (
          <div
            style={{
              height: 40,
              paddingLeft: 12,
              backgroundColor: index % 2 === 0 ? '#111111' : '#0f0f0f',
            }}
          >
            <span>{row}</span>
          </div>
        )}
      />
    </div>
  )
}

render(() => <App />)
