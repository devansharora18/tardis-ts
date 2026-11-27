import '@devansharora18/tardis-ts/web'
import { createSignal, dynamic, jsx, render, type SceneEvent } from '@devansharora18/tardis-ts/scene'
import { Button, Card, Page } from '../shared/ui'
import { colors, mono } from '../shared/theme'
import { calculate } from './calc'

const [expression, setExpression] = createSignal('')
const [result, setResult] = createSignal('0')
const [history, setHistory] = createSignal<string[]>([])

const press = (key: string): void => {
  if (key === 'C') {
    setExpression('')
    setResult('0')
    return
  }
  if (key === '⌫') {
    setExpression((value) => value.slice(0, -1))
    return
  }
  if (key === '=') {
    const next = calculate(expression())
    setResult(next)
    if (next !== 'Error') {
      setHistory((items) => [`${expression()} = ${next}`, ...items].slice(0, 8))
      setExpression(next)
    }
    return
  }
  setExpression((value) => value + key)
}

const keys = ['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '=']

function App(): ReturnType<typeof jsx> {
  return jsx(
    Page,
    {
      title: 'Tardis Calculator',
      subtitle: 'Keyboard and pointer · expression history',
      children: [
        jsx(
          'div',
          {
            tabIndex: 0,
            onKeyDown: (event: SceneEvent) => {
              const key = event.key ?? ''
              if (/^[0-9.+\-*/()%]$/.test(key)) press(key)
              if (key === 'Enter') press('=')
              if (key === 'Backspace') press('⌫')
              if (key === 'Escape') press('C')
            },
            style: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
          },
          jsx(
            'div',
            {
              style: {
                width: 300,
                padding: 14,
                gap: 10,
                borderRadius: 12,
                backgroundColor: colors.panel,
                borderWidth: 1,
                borderColor: colors.border,
              },
            },
            jsx(
              'div',
              {
                style: {
                  minHeight: 62,
                  padding: 10,
                  gap: 4,
                  borderRadius: 8,
                  backgroundColor: '#0b0f14',
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              },
              jsx(
                'span',
                {
                  style: {
                    flexGrow: 1,
                    textAlign: 'right',
                    color: colors.muted,
                    fontSize: 12,
                    fontFamily: mono,
                  },
                },
                dynamic(() => expression() || ' ')
              ),
              jsx(
                'span',
                {
                  style: {
                    textAlign: 'right',
                    color: colors.text,
                    fontSize: 28,
                    fontWeight: 600,
                    fontFamily: mono,
                  },
                },
                dynamic(() => result())
              )
            ),
            ...Array.from({ length: 5 }, (_, row) =>
              jsx(
                'div',
                { key: row, style: { flexDirection: 'row', gap: 8 } },
                ...keys.slice(row * 4, row * 4 + 4).map((key) =>
                  jsx(
                    'div',
                    {
                      key,
                      role: 'button',
                      tabIndex: 0,
                      onClick: () => press(key),
                      style: {
                        flexGrow: 1,
                        height: 42,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 7,
                        backgroundColor:
                          key === '='
                            ? '#238636'
                            : /[0-9.]/.test(key)
                              ? colors.panel2
                              : '#1f2937',
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: key === '=' ? 700 : 400,
                      },
                    },
                    key
                  )
                )
              )
            )
          ),
          jsx(Card, {
            title: 'HISTORY',
            children: [
              ...history().map((entry, index) =>
                jsx(
                  'div',
                  {
                    key: `${entry}-${index}`,
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => {
                      const value = entry.split(' = ')[1]
                      if (value) setExpression(value)
                    },
                    style: {
                      padding: 7,
                      borderRadius: 5,
                      backgroundColor: colors.panel2,
                      color: colors.muted,
                      fontFamily: mono,
                      fontSize: 12,
                    },
                  },
                  entry
                )
              ),
              history().length === 0
                ? jsx('span', { style: { color: colors.dim, fontSize: 11 } }, 'No calculations yet')
                : null,
              jsx(
                'span',
                { style: { color: colors.dim, fontSize: 11, lineHeight: 16 } },
                'Tip: click the keypad, then use the keyboard.'
              ),
            ],
          })
        ),
      ],
    }
  )
}

render(() => jsx(App))
