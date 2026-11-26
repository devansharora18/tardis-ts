import '@devansharora18/tardis-ts/web'
import { createSignal, dynamic, jsx, render } from '@devansharora18/tardis-ts/scene'

const ROWS = 10_000
const FRAMES = 120
const [tick, setTick] = createSignal(0)

const rows = Array.from({ length: ROWS }, (_, index) =>
  jsx(
    'div',
    { style: { fontSize: 12, display: 'block' } },
    dynamic(() => `${index}: ${tick()}`)
  )
)

function App() {
  return jsx(
    'div',
    {
      style: {
        backgroundColor: '#0a0a0a',
        color: '#ededed',
        fontSize: 12,
      },
    },
    ...rows
  )
}

render(() => jsx(App))

declare global {
  interface Window {
    __benchResult?: Record<string, number>
  }
}

async function run(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  const samples: number[] = []
  let last = performance.now()
  for (let index = 0; index < FRAMES; index += 1) {
    setTick(index)
    await new Promise<number>((resolve) => requestAnimationFrame(resolve))
    const now = performance.now()
    samples.push(now - last)
    last = now
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const count = sorted.length
  const mean = sorted.reduce((sum, value) => sum + value, 0) / count
  window.__benchResult = {
    frames: count,
    mean,
    p50: sorted[Math.floor(count / 2)]!,
    p95: sorted[Math.min(Math.floor(count * 0.95), count - 1)]!,
    dropped: sorted.filter((value) => value > 16.7).length,
    fps: 1000 / mean,
  }
}

void run()
