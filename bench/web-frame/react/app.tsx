import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

const ROWS = 10_000
const FRAMES = 120

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

function App(): JSX.Element {
  const [tick, setTick] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
      const samples: number[] = []
      let last = performance.now()
      for (let frame = 0; frame < FRAMES; frame += 1) {
        setTick(frame)
        await nextFrame()
        const now = performance.now()
        samples.push(now - last)
        last = now
      }
      const sorted = [...samples].sort((a, b) => a - b)
      const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length
      ;(window as unknown as Record<string, unknown>)['__benchResult'] = {
        frames: sorted.length,
        mean,
        p50: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)],
        dropped: sorted.filter((value) => value > 16.7).length,
        fps: 1000 / mean,
      }
    })()
  }, [])

  return (
    <div style={{ font: '12px monospace', background: '#0a0a0a', color: '#ededed' }}>
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index}>
          {index}: {tick}
        </div>
      ))}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
