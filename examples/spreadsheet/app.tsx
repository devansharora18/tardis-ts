import '@devansharora18/tardisjs/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
  VirtualList,
} from '@devansharora18/tardisjs/scene'
import { cellRef, displayCell, type Cells } from './formula'

const ROWS = 100_000
const ROW_HEIGHT = 30
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const CELL_WIDTH = 96
const ROW_HEADER = 54

const seeds: Cells = {
  A1: 'Widget',
  B1: '2',
  C1: '9.5',
  D1: '=B1*C1',
  A2: 'Gadget',
  B2: '5',
  C2: '4',
  D2: '=B2*C2',
  A3: 'Total',
  D3: '=SUM(D1:D2)',
  A4: 'Average',
  D4: '=AVERAGE(D1:D2)',
}

const [cells, setCells] = createSignal<Cells>(seeds)
const [active, setActive] = createSignal({ row: 0, column: 0 })
const [draft, setDraft] = createSignal(seeds['A1'] ?? '')
const [status, setStatus] = createSignal('Ready')
const [scrollTop, setScrollTop] = createSignal(0)
declare global {
  interface Window {
    __benchResult?: Record<string, number>
  }
}
const rows = Array.from({ length: ROWS }, (_, index) => index)

const activeRef = (): string => cellRef(active().row, active().column)

const select = (row: number, column: number): void => {
  const next = {
    row: Math.min(Math.max(0, row), ROWS - 1),
    column: Math.min(Math.max(0, column), COLUMNS.length - 1),
  }
  setActive(next)
  const ref = cellRef(next.row, next.column)
  setDraft(cells()[ref] ?? '')
  setStatus(`Selected ${ref}`)
}

const commit = (): void => {
  const ref = activeRef()
  const value = draft()
  setCells((current) => {
    const next = { ...current }
    if (value === '') delete next[ref]
    else next[ref] = value
    return next
  })
  setStatus(`${ref} saved`)
}

const clear = (): void => {
  const ref = activeRef()
  setCells((current) => {
    const next = { ...current }
    delete next[ref]
    return next
  })
  setDraft('')
  setStatus(`Cleared ${ref}`)
}

const onGridKey = (event: { key?: string }): void => {
  const current = active()
  switch (event.key) {
    case 'ArrowUp':
      select(current.row - 1, current.column)
      return
    case 'ArrowDown':
      select(current.row + 1, current.column)
      return
    case 'ArrowLeft':
      select(current.row, current.column - 1)
      return
    case 'ArrowRight':
      select(current.row, current.column + 1)
      return
    case 'PageUp':
      select(current.row - 20, current.column)
      return
    case 'PageDown':
      select(current.row + 20, current.column)
      return
    case 'Home':
      select(current.row, 0)
      return
    case 'End':
      select(current.row, COLUMNS.length - 1)
      return
    case 'Enter':
      commit()
      select(current.row + 1, current.column)
      return
    case 'Delete':
    case 'Backspace':
      clear()
      return
    default:
      return
  }
}

function ToolbarButton(props: {
  label: string
  onClick: () => void
}): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      role: 'button',
      tabIndex: 0,
      onClick: props.onClick,
      style: {
        paddingTop: 7,
        paddingBottom: 7,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#30363d',
        backgroundColor: '#21262d',
        color: '#ededed',
        fontSize: 12,
      },
    },
    props.label
  )
}

function App(): ReturnType<typeof jsx> {
  const info = (): string => {
    const selected = active()
    const raw = cells()[cellRef(selected.row, selected.column)] ?? ''
    const value = displayCell(cellRef(selected.row, selected.column), cells())
    return raw.startsWith('=') ? `${raw} → ${value}` : value
  }

  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        padding: 20,
        gap: 12,
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        fontSize: 13,
      },
    },
    jsx(
      'div',
      {
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
      },
      jsx('span', { style: { fontSize: 18, fontWeight: 600 } }, 'Tardis Sheet'),
      jsx(
        'span',
        { style: { color: '#8b949e', fontSize: 12, width: 300 } },
        '100,000 rows × 8 columns · virtualized'
      ),
      jsx('div', { style: { flexGrow: 1 } }),
      jsx(ToolbarButton, { label: 'Clear cell', onClick: clear }),
      jsx(ToolbarButton, { label: 'Apply', onClick: commit })
    ),
    jsx(
      'div',
      {
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#30363d',
          backgroundColor: '#161b22',
        },
      },
      jsx(
        'span',
        { style: { color: '#58a6ff', fontWeight: 600, width: 64 } },
        dynamic(() => activeRef())
      ),
      jsx('span', { style: { color: '#8b949e' } }, 'fx'),
      jsx(TextField, {
        value: () => draft(),
        onChange: setDraft,
        onSubmit: commit,
        ariaLabel: 'Formula bar',
        width: 620,
        placeholder: 'Value or =SUM(A1:A10)',
      }),
      jsx(
        'span',
        { style: { color: '#8b949e', fontSize: 12, flexGrow: 1 } },
        dynamic(() => info())
      )
    ),
    jsx(
      'div',
      {
        tabIndex: 0,
        onKeyDown: onGridKey,
        style: {
          flexDirection: 'column',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#30363d',
          overflow: 'hidden',
          backgroundColor: '#0d1117',
        },
      },
      jsx(
        'div',
        {
          style: {
            flexDirection: 'row',
            height: 30,
            backgroundColor: '#161b22',
            borderColor: '#30363d',
            borderWidth: 1,
          },
        },
        jsx(
          'span',
          {
            style: {
              width: ROW_HEADER,
              paddingLeft: 8,
              color: '#8b949e',
              fontSize: 11,
            },
          },
          '#'
        ),
        ...COLUMNS.map((column) =>
          jsx(
            'span',
            {
              key: column,
              style: {
                width: CELL_WIDTH,
                paddingLeft: 8,
                color: '#8b949e',
                fontSize: 11,
              },
            },
            column
          )
        )
      ),
      jsx(VirtualList, {
        items: () => rows,
        rowHeight: ROW_HEIGHT,
        height: 560,
        overscan: 2,
        scrollTop: () => scrollTop(),
        onScroll: setScrollTop,
        renderRow: (row) =>
          jsx(
            'div',
            {
              key: row,
              style: {
                height: ROW_HEIGHT,
                flexDirection: 'row',
                backgroundColor: row % 2 === 0 ? '#0d1117' : '#10151c',
              },
            },
            jsx(
              'span',
              {
                style: {
                  width: ROW_HEADER,
                  paddingLeft: 8,
                  color: '#484f58',
                  fontSize: 11,
                  backgroundColor: '#0b0f14',
                },
              },
              String(row + 1)
            ),
            ...COLUMNS.map((_, column) => {
              const ref = cellRef(row, column)
              return jsx(
                'div',
                {
                  key: ref,
                  onClick: () => select(row, column),
                  style: () => {
                    const selected =
                      active().row === row && active().column === column
                    return {
                      width: CELL_WIDTH,
                      height: ROW_HEIGHT,
                      paddingLeft: 8,
                      paddingRight: 4,
                      borderColor: '#1b2027',
                      borderWidth: 1,
                      backgroundColor: selected
                        ? '#1f6feb55'
                        : row % 2 === 0
                          ? '#0d1117'
                          : '#10151c',
                      color:
                        ref === 'A1' || ref === 'A2' || ref === 'A3' || ref === 'A4'
                          ? '#e6edf3'
                          : '#c9d1d9',
                    }
                  },
                },
                dynamic(() => displayCell(ref, cells()))
              )
            })
          ),
      })
    ),
    jsx(
      'div',
      {
        style: {
          flexDirection: 'row',
          gap: 16,
          color: '#8b949e',
          fontSize: 12,
        },
      },
      jsx('span', {}, dynamic(() => `Cell ${activeRef()}`)),
      jsx('span', {}, dynamic(() => `${ROWS.toLocaleString()} rows`)),
      jsx('span', {}, 'Click a cell, edit in the formula bar, Enter applies'),
      jsx('span', { style: { flexGrow: 1 } }, dynamic(() => status()))
    )
  )
}

render(() => jsx(App))

async function runSheetBench(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  const samples: number[] = []
  const max = ROWS * ROW_HEIGHT - 560
  let last = performance.now()
  for (let frame = 0; frame < 120; frame += 1) {
    setScrollTop((frame * ROW_HEIGHT * 8) % max)
    await new Promise<number>((resolve) => requestAnimationFrame(resolve))
    const now = performance.now()
    samples.push(now - last)
    last = now
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length
  window.__benchResult = {
    frames: sorted.length,
    mean,
    p50: sorted[Math.floor(sorted.length / 2)]!,
    p95: sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)]!,
    dropped: sorted.filter((value) => value > 16.7).length,
    fps: 1000 / mean,
  }
}

if (
  typeof window !== 'undefined' &&
  window.location.search.includes('sheetBench=1')
) {
  void runSheetBench()
}
