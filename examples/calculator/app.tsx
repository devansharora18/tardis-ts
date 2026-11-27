import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  ScrollView,
  writeClipboard,
  type SceneEvent,
} from '@devansharora18/tardis-ts/scene'
import { calculate } from './calc'
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

interface Entry {
  id: string
  expression: string
  result: string
}

const ACCENT: Accent = accents.outlook
const STORAGE_KEY = 'tardis-ts.calculator.history.v2'
const [expression, setExpression] = createSignal('')
const [result, setResult] = createSignal('0')
const [history, setHistory] = createSignal<Entry[]>(loadHistory())
const [memory, setMemory] = createSignal<number | null>(null)
const [showHistory, setShowHistory] = createSignal(true)
const [status, setStatus] = createSignal('Ready')

function loadHistory(): Entry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as Entry[]
    return Array.isArray(parsed) ? parsed.slice(0, 30) : []
  } catch {
    return []
  }
}

function saveHistory(next: Entry[]): void {
  setHistory(next)
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // memory only
  }
}

function press(key: string): void {
  if (key === 'C') {
    setExpression('')
    setResult('0')
    setStatus('Cleared')
    return
  }
  if (key === '⌫') {
    setExpression((value) => value.slice(0, -1))
    return
  }
  if (key === '±') {
    const current = expression()
    if (current === '') {
      setExpression(result().startsWith('-') ? result().slice(1) : `-${result()}`)
    } else {
      setExpression(current.startsWith('-') ? current.slice(1) : `-${current}`)
    }
    return
  }
  if (key === '=') {
    const value = calculate(expression())
    setResult(value)
    if (value !== 'Error') {
      const entry: Entry = {
        id: `calc-${Date.now()}`,
        expression: expression(),
        result: value,
      }
      saveHistory([entry, ...history()].slice(0, 30))
      setExpression(value)
      setStatus(`${expression()} = ${value}`)
    } else {
      setStatus('Invalid expression')
    }
    return
  }
  setExpression((value) => value + key)
}

function recallMemory(): void {
  if (memory() === null) {
    setStatus('Memory is empty')
    return
  }
  setExpression(String(memory()))
  setStatus('Memory recalled')
}

function copyResult(): void {
  writeClipboard(result())
  setStatus('Result copied')
}

const KEYS: Array<Array<{ key: string; tone?: 'operator' | 'equal' | 'function' }>> = [
  [
    { key: 'C', tone: 'function' },
    { key: '⌫', tone: 'function' },
    { key: '±', tone: 'function' },
    { key: '÷', tone: 'operator' },
  ],
  [
    { key: '7' },
    { key: '8' },
    { key: '9' },
    { key: '×', tone: 'operator' },
  ],
  [
    { key: '4' },
    { key: '5' },
    { key: '6' },
    { key: '−', tone: 'operator' },
  ],
  [
    { key: '1' },
    { key: '2' },
    { key: '3' },
    { key: '+', tone: 'operator' },
  ],
  [
    { key: '0' },
    { key: '.' },
    { key: '%' },
    { key: '=', tone: 'equal' },
  ],
]

function mapped(key: string): string {
  if (key === '÷') return '/'
  if (key === '×') return '*'
  if (key === '−') return '-'
  return key
}

function Keypad(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    { style: { flexDirection: 'column', gap: 5 } },
    ...KEYS.map((row, rowIndex) =>
      jsx(
        'div',
        { key: rowIndex, style: { flexDirection: 'row', gap: 5 } },
        ...row.map((entry) =>
          jsx(
            'div',
            {
              key: entry.key,
              role: 'button',
              tabIndex: 0,
              'aria-label': entry.key,
              onClick: () => press(mapped(entry.key)),
              style: {
                flexGrow: 1,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                backgroundColor:
                  entry.tone === 'equal'
                    ? ACCENT.main
                    : entry.tone === 'operator'
                      ? ACCENT.tint
                      : entry.tone === 'function'
                        ? office.chrome
                        : office.surface,
                borderWidth: 1,
                borderColor:
                  entry.tone === 'equal'
                    ? ACCENT.main
                    : entry.tone === 'operator'
                      ? ACCENT.main
                      : office.border,
              },
            },
            jsx(
              'span',
              {
                style: {
                  fontSize: 16,
                  color:
                    entry.tone === 'equal' ? '#ffffff' : office.ink,
                },
              },
              entry.key
            )
          )
        )
      )
    )
  )
}

function CalculatorCard(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 360,
        gap: 8,
        padding: 12,
        backgroundColor: office.surface,
        borderWidth: 1,
        borderColor: office.border,
        borderRadius: 6,
      },
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 4 } },
      ...['MC', 'MR', 'M+', 'M−', 'MS'].map((label) =>
        jsx(
          'div',
          {
            key: label,
            role: 'button',
            tabIndex: 0,
            onClick: () => {
              if (label === 'MC') {
                setMemory(null)
                setStatus('Memory cleared')
              }
              if (label === 'MR') recallMemory()
              if (label === 'MS') {
                const value = Number(result())
                if (Number.isFinite(value)) {
                  setMemory(value)
                  setStatus('Stored in memory')
                }
              }
              if (label === 'M+') {
                const value = Number(result())
                if (Number.isFinite(value)) {
                  setMemory((current) => (current ?? 0) + value)
                  setStatus('Added to memory')
                }
              }
              if (label === 'M−') {
                const value = Number(result())
                if (Number.isFinite(value)) {
                  setMemory((current) => (current ?? 0) - value)
                  setStatus('Subtracted from memory')
                }
              }
            },
            style: {
              flexGrow: 1,
              height: 22,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              borderWidth: 1,
              borderColor: office.borderSoft,
            },
          },
          jsx('span', { style: { fontSize: 9.5, color: office.muted } }, label)
        )
      )
    ),
    jsx(
      'div',
      {
        style: {
          height: 108,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 12,
          paddingRight: 12,
          gap: 4,
          backgroundColor: office.chromeAlt,
          borderWidth: 1,
          borderColor: office.borderSoft,
          borderRadius: 3,
        },
      },
      jsx(
        'div',
        { style: { flexDirection: 'row', alignItems: 'center', flexGrow: 1 } },
        jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted } },
          dynamic(() => (memory() === null ? '' : `M ${memory()}`))
        ),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted } },
          dynamic(() => expression() || '')
        )
      ),
      jsx(
        'span',
        {
          style: {
            fontSize: 36,
            fontWeight: 600,
            color: office.ink,
            textAlign: 'right',

          },
        },
        dynamic(() => result())
      )
    ),
    jsx(Keypad, {}),
    jsx(
      'span',
      { style: { fontSize: 9, color: office.dim, textAlign: 'center' } },
      'Keyboard: digits, operators, Enter, Backspace, Escape'
    )
  )
}

function HistoryPanel(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 300,
        minWidth: 300,
        padding: 10,
        gap: 6,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', alignItems: 'center' } },
      jsx(
        'span',
        { style: { fontSize: 11, fontWeight: 600, color: office.ink, flexGrow: 1 } },
        'History'
      ),
      jsx(
        'span',
        {
          role: 'button',
          tabIndex: 0,
          onClick: () => {
            saveHistory([])
            setStatus('History cleared')
          },
          style: { fontSize: 9.5, color: ACCENT.main },
        },
        'Clear'
      )
    ),
    jsx(ScrollView, {
      height: 460,
      contentHeight: Math.max(80, history().length * 48 + 20),
      showScrollbar: true,
      children: [
        jsx(
          'div',
          { style: { gap: 5 } },
          ...history().map((entry) =>
            jsx(
              'div',
              {
                key: entry.id,
                role: 'button',
                tabIndex: 0,
                onClick: () => {
                  setExpression(entry.result)
                  setResult(entry.result)
                  setStatus('History recalled')
                },
                style: {
                  padding: 7,
                  gap: 2,
                  backgroundColor: office.surface,
                  borderWidth: 1,
                  borderColor: office.borderSoft,
                  borderRadius: 2,
                },
              },
              jsx(
                'span',
                { style: { fontSize: 9.5, color: office.muted, whiteSpace: 'nowrap' } },
                entry.expression
              ),
              jsx(
                'span',
                { style: { fontSize: 13, color: office.ink, textAlign: 'right' } },
                entry.result
              )
            )
          ),
          history().length === 0
            ? jsx(
                'span',
                { style: { fontSize: 10.5, color: office.dim } },
                'No calculations yet'
              )
            : null
        ),
      ],
    }),
    jsx(
      'span',
      { style: { fontSize: 9, color: office.dim } },
      'Click an entry to recall the result'
    )
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Calculator',
    initial: 'C',
    file: 'Standard',
    accent: ACCENT,
    toolbar: jsx(Toolbar, {
      accent: ACCENT,
      children: [
        jsx(ToolbarButton, {
          icon: 'list',
          label: 'History',
          accent: ACCENT,
          active: showHistory(),
          onClick: () => setShowHistory((value) => !value),
        }),
        jsx(ToolbarButton, {
          icon: 'copy',
          label: 'Copy result',
          accent: ACCENT,
          onClick: copyResult,
        }),
        jsx(ToolbarButton, {
          icon: 'close',
          label: 'Clear history',
          accent: ACCENT,
          onClick: () => {
            saveHistory([])
            setStatus('History cleared')
          },
        }),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted } },
          'Standard'
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
      dynamic(() => `${history().length} calculations`)
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => (memory() === null ? 'No memory' : `M ${memory()}`))
    ),
    children: [
      jsx(
        'div',
        {
          tabIndex: 0,
          onKeyDown: (event: SceneEvent) => {
            const key = event.key ?? ''
            if (/^[0-9.+\-*/()%]$/.test(key)) press(key)
            else if (key === 'Enter') press('=')
            else if (key === 'Backspace') press('⌫')
            else if (key === 'Escape') press('C')
            else if (key === 'x' || key === 'X') press('*')
          },
          style: {
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 18,
            backgroundColor: '#e6e6e6',
            minHeight: 0,
          },
        },
        jsx(CalculatorCard, {}),
        dynamic(() => (showHistory() ? jsx(HistoryPanel, {}) : null))
      ),
    ],
  })
}

render(() => jsx(App))
