import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  writeClipboard,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

const ACCENT: Accent = accents.excel
const [count, setCount] = createSignal(0)
const [status, setStatus] = createSignal('Ready')
const host =
  typeof document === 'undefined' ? 'Native window · QuickJS' : 'Web browser · DOM host'

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Counter',
    initial: 'C',
    file: 'Starter.tsx',
    accent: ACCENT,
    toolbar: jsx(Toolbar, {
      accent: ACCENT,
      children: [
        jsx(ToolbarButton, {
          icon: 'plus',
          label: 'Increment',
          accent: ACCENT,
          onClick: () => setCount((value) => value + 1),
        }),
        jsx(ToolbarButton, {
          icon: 'minus',
          label: 'Decrement',
          accent: ACCENT,
          onClick: () => setCount((value) => value - 1),
        }),
        jsx(ToolbarButton, {
          icon: 'undo',
          label: 'Reset',
          accent: ACCENT,
          onClick: () => {
            setCount(0)
            setStatus('Reset to zero')
          },
        }),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(ToolbarButton, {
          icon: 'copy',
          label: 'Copy value',
          accent: ACCENT,
          onClick: () => {
            writeClipboard(String(count()))
            setStatus('Value copied')
          },
        }),
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
      dynamic(() => `count = ${count()}`)
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      host
    ),
    children: [
      jsx(
        'div',
        {
          style: {
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 20,
            backgroundColor: '#e6e6e6',
            minHeight: 0,
          },
        },
        jsx(
          'div',
          {
            style: {
              width: 470,
              padding: 30,
              gap: 14,
              backgroundColor: office.surface,
              borderWidth: 1,
              borderColor: office.border,
              borderRadius: 6,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 10, fontWeight: 600, color: ACCENT.main } },
            'TARDIS TS STARTER'
          ),
          jsx(
            'span',
            { style: { fontSize: 27, fontWeight: 600, color: office.ink } },
            'One signal. Two hosts.'
          ),
          jsx(
            'span',
            { style: { fontSize: 12, color: office.muted, lineHeight: 18 } },
            'Components run once. The count below is a signal bound to the retained scene tree; the same file renders in a native window and a browser.'
          ),
          jsx(
            'div',
            {
              style: {
                alignItems: 'center',
                gap: 8,
                paddingTop: 8,
                paddingBottom: 8,
                backgroundColor: office.chromeAlt,
                borderWidth: 1,
                borderColor: office.borderSoft,
                borderRadius: 4,
              },
            },
            jsx(
              'span',
              { style: { fontSize: 72, fontWeight: 600, color: office.ink, lineHeight: 80 } },
              dynamic(() => String(count()))
            ),
            jsx(
              'span',
              { style: { fontSize: 10, color: office.muted } },
              'signal value'
            )
          ),
          jsx(
            'div',
            { style: { flexDirection: 'row', gap: 8, justifyContent: 'center' } },
            jsx(
              'div',
              {
                role: 'button',
                tabIndex: 0,
                onClick: () => setCount((value) => value - 1),
                style: {
                  width: 64,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: office.surface,
                  borderWidth: 1,
                  borderColor: office.borderStrong,
                  borderRadius: 3,
                },
              },
              jsx('span', { style: { fontSize: 20, color: office.ink } }, '−')
            ),
            jsx(
              'div',
              {
                role: 'button',
                tabIndex: 0,
                onClick: () => setCount(0),
                style: {
                  width: 120,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: office.chromeAlt,
                  borderWidth: 1,
                  borderColor: office.borderStrong,
                  borderRadius: 3,
                },
              },
              jsx('span', { style: { fontSize: 11, color: office.ink } }, 'Reset')
            ),
            jsx(
              'div',
              {
                role: 'button',
                tabIndex: 0,
                onClick: () => setCount((value) => value + 1),
                style: {
                  width: 64,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: ACCENT.main,
                  borderWidth: 1,
                  borderColor: ACCENT.main,
                  borderRadius: 3,
                },
              },
              jsx('span', { style: { fontSize: 20, color: '#ffffff' } }, '+')
            )
          ),
          jsx(
            'span',
            { style: { fontSize: 9.5, color: office.dim, textAlign: 'center' } },
            'Click the buttons or run the same file with --target web.'
          )
        ),
        jsx(
          'div',
          {
            style: {
              width: 300,
              padding: 16,
              gap: 8,
              backgroundColor: office.chrome,
              borderColor: office.borderSoft,
              borderWidth: 1,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
            'RUN IT'
          ),
          jsx(
            'span',
            { style: { fontFamily: 'monospace', fontSize: 10.5, color: office.ink, lineHeight: 17 } },
            'npx @devansharora18/tardis-ts create'
          ),
          jsx(
            'span',
            { style: { fontFamily: 'monospace', fontSize: 10.5, color: office.ink, lineHeight: 17 } },
            'npx tardis-ts dev app.tsx'
          ),
          jsx(
            'span',
            { style: { fontFamily: 'monospace', fontSize: 10.5, color: office.ink, lineHeight: 17 } },
            'npx tardis-ts dev app.tsx --target web'
          ),
          jsx('div', { style: { height: 1, backgroundColor: office.borderSoft } }),
          jsx(
            'span',
            { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
            'THIS FILE SHOWS'
          ),
          ...['createSignal state', 'event handlers', 'dynamic text binding', 'one TSX entry for both hosts'].map(
            (item) =>
              jsx(
                'div',
                { key: item, style: { flexDirection: 'row', gap: 6 } },
                jsx('span', { style: { fontSize: 10, color: ACCENT.main } }, '•'),
                jsx('span', { style: { fontSize: 10.5, color: office.ink } }, item)
              )
          ),
          jsx('div', { style: { flexGrow: 1 } }),
          jsx(
            'span',
            { style: { fontSize: 9, color: office.dim, lineHeight: 13 } },
            host
          )
        )
      ),
    ],
  })
}

render(() => jsx(App))
