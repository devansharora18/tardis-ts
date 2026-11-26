import '@devansharora18/tardisjs/web'
import {
  createSignal,
  dynamic,
  focusNode,
  jsx,
  render,
  ScrollView,
  TextField,
  writeClipboard,
  type SceneEvent,
} from '@devansharora18/tardisjs/scene'

interface File {
  id: string
  name: string
  content: string
  dirty: boolean
}

const initialFiles: File[] = [
  {
    id: 'welcome',
    name: 'WELCOME.md',
    dirty: false,
    content: `# Tardis Code

A small code editor in TSX.
The same file runs native and on the web.

## Shortcuts
- Ctrl/Cmd+Shift+P: command palette
- Ctrl/Cmd+S: save
- Ctrl/Cmd+N: new file
- Ctrl/Cmd+W: close editor
- Tab / Shift+Tab: indent
- Enter: keeps indentation

## Status
This is a focused editor demo, not a
full IDE. It has no syntax highlighting,
LSP, terminals, or Git integration yet.
`,
  },
  {
    id: 'main',
    name: 'main.ts',
    dirty: false,
    content: `export function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(Math.max(value, min), max)
}

export function frameDelta(
  previous: number,
  next: number,
): number {
  return clamp(next - previous, 0, 1000)
}
`,
  },
  {
    id: 'styles',
    name: 'styles.css',
    dirty: false,
    content: `.editor {
  display: flex;
  gap: 12px;
  background: #1e1e1e;
}

.status {
  color: #cccccc;
  font-size: 12px;
}
`,
  },
]

type Activity = 'explorer' | 'search' | 'git' | 'run' | 'extensions'

const [files, setFiles] = createSignal<File[]>(initialFiles)
const [activeId, setActiveId] = createSignal('welcome')
const [caret, setCaret] = createSignal(0)
const [status, setStatus] = createSignal('Ready')
const [activity, setActivity] = createSignal<Activity>('explorer')
const [filter, setFilter] = createSignal('')
const [palette, setPalette] = createSignal(false)
const [query, setQuery] = createSignal('')
const [sidebar, setSidebar] = createSignal(true)
const [paletteIndex, setPaletteIndex] = createSignal(0)
let untitled = 0

const active = (): File =>
  files().find((file) => file.id === activeId()) ?? files()[0]!

const updateActive = (content: string): void => {
  setFiles((list) =>
    list.map((file) =>
      file.id === activeId() ? { ...file, content, dirty: true } : file
    )
  )
}

const caretInfo = (): { line: number; column: number } => {
  const text = active().content
  const at = Math.min(Math.max(0, caret()), text.length)
  const before = text.slice(0, at)
  return {
    line: before.split('\n').length,
    column: at - before.lastIndexOf('\n'),
  }
}

const lineCount = (): number => active().content.split('\n').length

const selectFile = (id: string): void => {
  setActiveId(id)
  setStatus(`Opened ${files().find((file) => file.id === id)?.name ?? id}`)
}

const newFile = (): void => {
  untitled += 1
  const id = `untitled-${untitled}`
  const file: File = {
    id,
    name: `untitled-${untitled}.ts`,
    content: '',
    dirty: true,
  }
  setFiles((list) => [...list, file])
  selectFile(id)
  setCaret(0)
}

const closeFile = (id: string): void => {
  const list = files()
  if (list.length === 1) {
    setStatus('Cannot close the last editor')
    return
  }
  const index = list.findIndex((file) => file.id === id)
  const next = list.filter((file) => file.id !== id)
  setFiles(next)
  if (id === activeId()) {
    setActiveId((next[Math.max(0, index - 1)] ?? next[0]!).id)
  }
}

const openFile = (): void => {
  if (typeof document === 'undefined') {
    setStatus('Open is available on the web build')
    return
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.txt,.md,.ts,.tsx,.js,.jsx,.css,.json,.html'
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return
    const content = await file.text()
    const id = `${file.name}-${Date.now()}`
    setFiles((list) => [...list, { id, name: file.name, content, dirty: false }])
    selectFile(id)
    setCaret(0)
  })
  input.click()
}

const save = async (): Promise<void> => {
  const file = active()
  await writeClipboard(file.content)
  let downloaded = false
  if (
    typeof document !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  ) {
    const blob = new Blob([file.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    URL.revokeObjectURL(url)
    downloaded = true
  }
  setFiles((list) =>
    list.map((entry) =>
      entry.id === file.id ? { ...entry, dirty: false } : entry
    )
  )
  setStatus(downloaded ? `Saved ${file.name}` : `Copied ${file.name}`)
}

const iconFor = (name: string): { label: string; color: string } => {
  if (name.endsWith('.ts') || name.endsWith('.tsx')) {
    return { label: 'TS', color: '#3178c6' }
  }
  if (name.endsWith('.css')) return { label: '#', color: '#519aba' }
  if (name.endsWith('.md')) return { label: 'M', color: '#8b949e' }
  return { label: 'F', color: '#8b949e' }
}

interface Command {
  label: string
  keys: string
  run: () => void
}

const commands = (): Command[] => [
  { label: 'New File', keys: 'Ctrl+N', run: newFile },
  { label: 'Save / Download', keys: 'Ctrl+S', run: () => void save() },
  { label: 'Close Editor', keys: 'Ctrl+W', run: () => closeFile(activeId()) },
  { label: 'Toggle Explorer', keys: '', run: () => setSidebar((value) => !value) },
  ...files().map((file) => ({
    label: `Go to ${file.name}`,
    keys: '',
    run: () => selectFile(file.id),
  })),
]

const runCommand = (command: Command): void => {
  setPalette(false)
  command.run()
}

const onKey = (event: SceneEvent): void => {
  const mods = event.mods ?? { ctrl: false, shift: false, alt: false, meta: false }
  const command = mods.ctrl || mods.meta
  if (command && mods.shift && event.key?.toLowerCase() === 'p') {
    event.defaultPrevented = true
    setPalette((value) => {
      const next = !value
      if (next) {
        setPaletteIndex(0)
        setQuery('')
        queueMicrotask(() => focusNode(paletteInput.id))
      }
      return next
    })
    return
  }
  if (palette() && event.key === 'Escape') {
    event.defaultPrevented = true
    setPalette(false)
    return
  }
  if (palette() && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.defaultPrevented = true
    const list = commands().filter((item) =>
      query().trim() === ''
        ? true
        : item.label.toLowerCase().includes(query().trim().toLowerCase())
    )
    if (list.length > 0) {
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setPaletteIndex(
        (value) => (value + direction + list.length) % list.length
      )
    }
    return
  }
  if (palette() && event.key === 'Enter') {
    event.defaultPrevented = true
    const text = query().trim().toLowerCase()
    const list = commands().filter((item) =>
      text === '' ? true : item.label.toLowerCase().includes(text)
    )
    const command = list[paletteIndex()]
    if (command) runCommand(command)
    return
  }
  if (command && event.key?.toLowerCase() === 's') {
    event.defaultPrevented = true
    void save()
    return
  }
  if (command && event.key?.toLowerCase() === 'n') {
    event.defaultPrevented = true
    newFile()
    return
  }
  if (command && event.key?.toLowerCase() === 'w') {
    event.defaultPrevented = true
    closeFile(activeId())
  }
}

const paletteInput = jsx(TextField, {
  value: () => query(),
  onChange: (value) => {
    setQuery(value)
    setPaletteIndex(0)
  },
  ariaLabel: 'Command palette',
  width: 520,
  placeholder: 'Type a command…',
  onKeyDown: onKey,
})

function IconButton(props: {
  label: string
  title?: string
  onClick: () => void
  active?: boolean
}): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      role: 'button',
      tabIndex: 0,
      'aria-label': props.title ?? props.label,
      onClick: props.onClick,
      style: {
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 10,
        paddingRight: 10,
        borderRadius: 4,
        backgroundColor: props.active ? '#37373d' : 'transparent',
        color: '#cccccc',
        fontSize: 12,
      },
    },
    props.label
  )
}

function App(): ReturnType<typeof jsx> {
  const info = (): { line: number; column: number } => caretInfo()
  const filteredCommands = (): Command[] => {
    const text = query().trim().toLowerCase()
    return commands().filter((command) =>
      text === '' ? true : command.label.toLowerCase().includes(text)
    )
  }
  const filteredFiles = (): File[] => {
    const text = filter().trim().toLowerCase()
    return files().filter((file) =>
      text === '' ? true : file.name.toLowerCase().includes(text)
    )
  }

  const editor = jsx(TextField, {
    value: () => active().content,
    onChange: updateActive,
    ariaLabel: 'Code editor',
    multiline: true,
    width: 860,
    rows: 26,
    fontFamily: 'monospace',
    tabInserts: true,
    autoIndent: true,
    wrap: false,
    onCaretChange: setCaret,
    onKeyDown: onKey,
    onFocus: () => setStatus('Editing'),
    lineStyle: (index) =>
      index + 1 === info().line ? { backgroundColor: '#232323' } : undefined,
  })

  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        backgroundColor: '#1e1e1e',
        color: '#cccccc',
        fontSize: 12,
      },
      onKeyDown: onKey,
    },
    // title bar
    jsx(
      'div',
      {
        style: {
          height: 34,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 10,
          paddingRight: 8,
          backgroundColor: '#3c3c3c',
          borderColor: '#252526',
          borderWidth: 1,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 12, fontWeight: 600, color: '#e7e7e7', width: 110 } },
        'Tardis Code'
      ),
      jsx('span', { style: { color: '#6a6a6a' } }, 'File  Edit  View  Go'),
      jsx('div', { style: { flexGrow: 1 } }),
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: () => {
            setPalette(true)
            setPaletteIndex(0)
            queueMicrotask(() => focusNode(paletteInput.id))
          },
          style: {
            width: 360,
            height: 22,
            paddingLeft: 10,
            justifyContent: 'center',
            borderRadius: 5,
            borderWidth: 1,
            borderColor: '#5a5a5a',
            backgroundColor: '#252526',
            color: '#9d9d9d',
            fontSize: 11,
          },
        },
        'Search commands  ·  Ctrl+Shift+P'
      ),
      jsx(IconButton, { label: 'New', onClick: newFile }),
      jsx(IconButton, { label: 'Open', onClick: openFile }),
      jsx(IconButton, { label: 'Save', onClick: () => void save() })
    ),
    // activity + sidebar + editor
    jsx(
      'div',
      {
        style: { flexDirection: 'row', flexGrow: 1, minHeight: 0 },
      },
      jsx(
        'div',
        {
          style: {
            width: 52,
            paddingTop: 6,
            gap: 2,
            backgroundColor: '#333333',
            alignItems: 'center',
          },
        },
        ...[
          ['explorer', 'F', 'Files'],
          ['search', 'Q', 'Search'],
          ['git', 'G', 'Source Control'],
          ['run', 'R', 'Run'],
          ['extensions', 'X', 'Extensions'],
        ].map(([id, letter, label]) =>
          jsx(
            'div',
            {
              key: id,
              role: 'button',
              tabIndex: 0,
              'aria-label': label!,
              onClick: () => {
                setActivity(id as Activity)
                setSidebar(true)
              },
              style: () => ({
                width: 48,
                height: 46,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderColor:
                  activity() === id ? '#007acc' : 'transparent',
                borderWidth: 1,
                color: activity() === id ? '#ffffff' : '#9d9d9d',
                backgroundColor:
                  activity() === id ? '#2a2d2e' : 'transparent',
              }),
            },
            jsx('span', { style: { fontSize: 16, fontWeight: 600 } }, letter!),
            jsx('span', { style: { fontSize: 8 } }, label!.split(' ')[0])
          )
        )
      ),
      jsx(
        'div',
        {
          style: () => ({
            display: sidebar() ? 'flex' : 'none',
            width: 224,
            paddingTop: 8,
            gap: 2,
            backgroundColor: '#252526',
            borderColor: '#1e1e1e',
            borderWidth: 1,
          }),
        },
        jsx(
          'span',
          {
            style: {
              paddingLeft: 14,
              paddingBottom: 6,
              color: '#bbbbbb',
              fontSize: 11,
              fontWeight: 600,
            },
          },
          dynamic(() => activity().toUpperCase())
        ),
        dynamic(() => {
          if (activity() === 'search') {
            return jsx(
              'div',
              { style: { padding: 8, gap: 8 } },
              jsx(TextField, {
                value: () => filter(),
                onChange: setFilter,
                ariaLabel: 'Filter files',
                width: 196,
                placeholder: 'Search files',
              }),
              ...filteredFiles().map((file) =>
                jsx(
                  'div',
                  {
                    key: file.id,
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => selectFile(file.id),
                    style: {
                      padding: 6,
                      borderRadius: 4,
                      color: '#cccccc',
                      fontSize: 12,
                    },
                  },
                  file.name
                )
              )
            )
          }
          if (activity() === 'git') {
            return jsx(
              'span',
              { style: { padding: 14, color: '#8b8b8b' } },
              'No source control providers.'
            )
          }
          if (activity() === 'run') {
            return jsx(
              'span',
              { style: { padding: 14, color: '#8b8b8b' } },
              'No launch configurations.'
            )
          }
          if (activity() === 'extensions') {
            return jsx(
              'span',
              { style: { padding: 14, color: '#8b8b8b' } },
              'No extensions installed.'
            )
          }
          return [
            jsx(
              'span',
              {
                key: 'open',
                style: {
                  paddingLeft: 14,
                  paddingTop: 4,
                  paddingBottom: 4,
                  color: '#bbbbbb',
                  fontSize: 11,
                  fontWeight: 600,
                },
              },
              'OPEN EDITORS'
            ),
            ...files()
              .filter((file) => file.id === activeId())
              .map((file) =>
                jsx(
                  'div',
                  {
                    key: `open-${file.id}`,
                    onClick: () => selectFile(file.id),
                    style: {
                      flexDirection: 'row',
                      gap: 6,
                      paddingTop: 4,
                      paddingBottom: 4,
                      paddingLeft: 22,
                      backgroundColor: '#37373d',
                      color: '#ffffff',
                      fontSize: 12,
                    },
                  },
                  jsx(
                    'span',
                    { style: { color: iconFor(file.name).color, fontSize: 10 } },
                    iconFor(file.name).label
                  ),
                  file.name
                )
              ),
            jsx(
              'span',
              {
                key: 'project',
                style: {
                  paddingLeft: 14,
                  paddingTop: 10,
                  paddingBottom: 4,
                  color: '#bbbbbb',
                  fontSize: 11,
                  fontWeight: 600,
                },
              },
              'PROJECT'
            ),
            jsx(
              'div',
              {
                key: 'folder',
                style: {
                  flexDirection: 'row',
                  gap: 6,
                  paddingTop: 4,
                  paddingBottom: 4,
                  paddingLeft: 12,
                  color: '#cccccc',
                  fontWeight: 600,
                },
              },
              jsx('span', { style: { fontSize: 10 } }, 'v'),
              'tardis-editor'
            ),
            ...files().map((file) =>
              jsx(
                'div',
                {
                  key: `tree-${file.id}`,
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => selectFile(file.id),
                  style: () => ({
                    flexDirection: 'row',
                    gap: 6,
                    paddingTop: 3,
                    paddingBottom: 3,
                    paddingLeft: 30,
                    color:
                      file.id === activeId() ? '#ffffff' : '#cccccc',
                    backgroundColor:
                      file.id === activeId() ? '#2a2d2e' : 'transparent',
                    fontSize: 12,
                  }),
                },
                jsx(
                  'span',
                  { style: { color: iconFor(file.name).color, fontSize: 10 } },
                  iconFor(file.name).label
                ),
                file.name,
                file.dirty ? ' ●' : ''
              )
            )
          ]
        })
      ),
      // editor group
      jsx(
        'div',
        { style: { flexGrow: 1, minWidth: 0 } },
        jsx(
          'div',
          {
            style: {
              flexDirection: 'row',
              height: 35,
              backgroundColor: '#252526',
            },
          },
          dynamic(() =>
            files().map((file) =>
              jsx(
                'div',
                {
                  key: `tab-${file.id}`,
                  role: 'tab',
                  tabIndex: 0,
                  onClick: () => selectFile(file.id),
                  style: () => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingLeft: 10,
                    paddingRight: 6,
                    borderColor:
                      file.id === activeId() ? '#007acc' : 'transparent',
                    borderWidth: 1,
                    backgroundColor:
                      file.id === activeId() ? '#1e1e1e' : '#2d2d2d',
                    color: file.id === activeId() ? '#ffffff' : '#9d9d9d',
                    fontSize: 12,
                  }),
                },
                jsx(
                  'span',
                  { style: { color: iconFor(file.name).color, fontSize: 10 } },
                  iconFor(file.name).label
                ),
                jsx('span', {}, file.name),
                file.dirty ? ' ●' : '',
                jsx(
                  'span',
                  {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `Close ${file.name}`,
                    onClick: () => closeFile(file.id),
                    style: {
                      paddingLeft: 6,
                      paddingRight: 4,
                      color: '#9d9d9d',
                      fontSize: 12,
                    },
                  },
                  '×'
                )
              )
            )
          )
        ),
        jsx(
          'div',
          {
            style: {
              height: 22,
              paddingLeft: 14,
              paddingTop: 2,
              gap: 6,
              flexDirection: 'row',
              backgroundColor: '#1e1e1e',
              color: '#9d9d9d',
              fontSize: 11,
            },
          },
          jsx('span', {}, 'src'),
          jsx('span', {}, '›'),
          jsx('span', {}, dynamic(() => active().name))
        ),
        jsx(
          'div',
          {
            style: {
              flexDirection: 'row',
              flexGrow: 1,
              backgroundColor: '#1e1e1e',
              minHeight: 0,
            },
          },
          jsx(
            ScrollView,
            {
              height: 620,
              contentHeight: () => Math.max(620, lineCount() * 22 + 50),
              showScrollbar: true,
              children: [
                jsx(
                  'div',
                  {
                    style: {
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      paddingTop: 6,
                      minHeight: 620,
                    },
                  },
                  jsx(
                    'div',
                    {
                      style: {
                        width: 50,
                        paddingTop: 3,
                        backgroundColor: '#1e1e1e',
                      },
                    },
                    dynamic(() => {
                      const activeLine = info().line
                      return Array.from({ length: lineCount() }, (_, index) =>
                        jsx(
                          'div',
                          {
                            key: String(index + 1),
                            style: {
                              height: 22,
                              minHeight: 22,
                              paddingRight: 12,
                              textAlign: 'right',
                              fontSize: 12,
                              color:
                                index + 1 === activeLine
                                  ? '#c6c6c6'
                                  : '#6e7681',
                            },
                          },
                          String(index + 1)
                        )
                      )
                    })
                  ),
                  editor,
                  jsx(
                    'div',
                    {
                      style: {
                        width: 64,
                        paddingTop: 3,
                        paddingLeft: 6,
                        gap: 1,
                        backgroundColor: '#1e1e1e',
                      },
                    },
                    dynamic(() =>
                      active().content.split('\n').map((line, index) =>
                        jsx('div', {
                          key: `mini-${index}`,
                          style: {
                            height: 2,
                            width: Math.max(2, Math.min(54, line.length * 1.4)),
                            backgroundColor:
                              index + 1 === info().line ? '#007acc' : '#3a3a3a',
                          },
                        })
                      )
                    )
                  )
                ),
              ],
            }
          )
        ),
        // status bar
        jsx(
          'div',
          {
            style: {
              height: 22,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingLeft: 10,
              paddingRight: 10,
              backgroundColor: '#007acc',
              color: '#ffffff',
              fontSize: 11,
            },
          },
          jsx('span', {}, 'branch main*'),
          jsx('span', {}, '0 errors  0 warnings'),
          jsx('span', { style: { flexGrow: 1 } }, dynamic(() => status())),
          jsx('span', {}, dynamic(() => `Ln ${info().line}, Col ${info().column}`)),
          jsx('span', {}, 'Spaces: 2'),
          jsx('span', {}, 'UTF-8'),
          jsx('span', {}, 'LF'),
          jsx('span', {}, dynamic(() => active().name.split('.').pop()!.toUpperCase())),
          jsx('span', {}, 'Tardis')
        )
      )
    ),
    // command palette
    jsx(
      'div',
      {
        style: () => ({
          display: palette() ? 'flex' : 'none',
          position: 'absolute',
          top: 70,
          left: 300,
          width: 560,
          gap: 0,
          borderWidth: 1,
          borderColor: '#454545',
          backgroundColor: '#252526',
        }),
      },
      paletteInput,
      jsx(
        'div',
        { style: { flexDirection: 'column', padding: 4 } },
        dynamic(() => {
          const list = filteredCommands()
          if (list.length === 0) {
            return jsx(
              'span',
              { style: { padding: 10, color: '#8b8b8b' } },
              'No matching commands.'
            )
          }
          return list.map((command, index) =>
            jsx(
              'div',
              {
                key: `${command.label}-${index}`,
                role: 'button',
                tabIndex: 0,
                onClick: () => runCommand(command),
                style: {
                  flexDirection: 'row',
                  paddingTop: 7,
                  paddingBottom: 7,
                  paddingLeft: 10,
                  paddingRight: 10,
                  backgroundColor:
                    index === paletteIndex() ? '#04395e' : 'transparent',
                  color: '#cccccc',
                },
              },
              jsx('span', { style: { flexGrow: 1 } }, command.label),
              jsx('span', { style: { color: '#8b8b8b' } }, command.keys)
            )
          )
        })
      )
    )
  )
}

render(() => jsx(App))
