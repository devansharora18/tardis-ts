import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
  writeClipboard,
} from '@devansharora18/tardis-ts/scene'
import { tokenize } from '../editor/syntax'
import { Button, Card, Page } from '../shared/ui'
import { colors, mono } from '../shared/theme'
import { parseMarkdown, readingMinutes, wordCount } from './markdown'

interface Document {
  id: string
  title: string
  content: string
}

const STORAGE_KEY = 'tardis-ts.word.documents'

const seed: Document[] = [
  {
    id: 'welcome',
    title: 'Welcome.md',
    content: `# Tardis Docs

A small word processor built with TSX
and a markdown engine.

## Why markdown?

It runs on desktop and web, stores as
plain text, and never locks documents in.

## Features

- document list with local persistence
- live preview
- word count and reading time
- export to markdown

> Type on the left, preview on the right.

\`\`\`ts
const [draft, setDraft] = createSignal('')
\`\`\`
`,
  },
  {
    id: 'release',
    title: 'Release notes.md',
    content: `# Release notes

## 2.0 alpha

- native and web targets
- spreadsheet, editor, paint, docs
- formulas and markdown engines
`,
  },
]

function load(): Document[] {
  if (typeof localStorage === 'undefined') return seed
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return seed
    const parsed = JSON.parse(stored) as Document[]
    return parsed.length > 0 ? parsed : seed
  } catch {
    return seed
  }
}

const [docs, setDocs] = createSignal<Document[]>(load())
const [activeId, setActiveId] = createSignal(docs()[0]!.id)
const [status, setStatus] = createSignal('Saved locally')

const active = (): Document =>
  docs().find((doc) => doc.id === activeId()) ?? docs()[0]!

const persist = (next: Document[]): void => {
  setDocs(next)
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
    setStatus('Saved locally')
  } catch {
    setStatus('Memory only')
  }
}

const update = (content: string): void => {
  persist(
    docs().map((doc) => (doc.id === activeId() ? { ...doc, content } : doc))
  )
}

const titleOf = (doc: Document): string =>
  doc.content.match(/^#\s+(.+)$/m)?.[1] ?? doc.title

const newDoc = (): void => {
  const id = `doc-${Date.now()}`
  persist([...docs(), { id, title: 'Untitled.md', content: '# Untitled\n\n' }])
  setActiveId(id)
}

const remove = (id: string): void => {
  if (docs().length === 1) return
  const next = docs().filter((doc) => doc.id !== id)
  persist(next)
  if (activeId() === id) setActiveId(next[0]!.id)
}

const exportDoc = async (): Promise<void> => {
  const doc = active()
  await writeClipboard(doc.content)
  if (typeof document !== 'undefined') {
    const anchor = document.createElement('a')
    anchor.href = `data:text/markdown;charset=utf-8,${encodeURIComponent(doc.content)}`
    anchor.download = `${doc.title.replace(/\.md$/, '')}.md`
    anchor.click()
  }
  setStatus('Exported markdown')
}

function Preview(props: { source: string }): ReturnType<typeof jsx> {
  const blocks = parseMarkdown(props.source)
  return jsx(
    'div',
    { style: { gap: 9, padding: 24, backgroundColor: '#0f141b', flexGrow: 1 } },
    ...blocks.map((block, index) => {
      if (block.type === 'h1') {
        return jsx(
          'span',
          {
            key: index,
            style: { fontSize: 28, fontWeight: 700, color: colors.text, marginBottom: 4 },
          },
          block.text
        )
      }
      if (block.type === 'h2') {
        return jsx(
          'span',
          {
            key: index,
            style: { fontSize: 20, fontWeight: 600, color: colors.text, marginTop: 8 },
          },
          block.text
        )
      }
      if (block.type === 'h3') {
        return jsx(
          'span',
          { key: index, style: { fontSize: 16, fontWeight: 600, color: colors.text } },
          block.text
        )
      }
      if (block.type === 'li') {
        return jsx(
          'div',
          { key: index, style: { flexDirection: 'row', gap: 8 } },
          jsx('span', { style: { color: colors.accent } }, '•'),
          jsx('span', { style: { color: '#c9d1d9', lineHeight: 22 } }, block.text)
        )
      }
      if (block.type === 'quote') {
        return jsx(
          'div',
          {
            key: index,
            style: {
              paddingLeft: 12,
              borderColor: colors.accent,
              borderWidth: 2,
              color: colors.muted,
              lineHeight: 22,
            },
          },
          block.text
        )
      }
      if (block.type === 'code') {
        return jsx(
          'div',
          {
            key: index,
            style: {
              padding: 12,
              borderRadius: 6,
              backgroundColor: '#161b22',
              color: '#9cdcfe',
              fontFamily: mono,
              fontSize: 12,
              lineHeight: 20,
            },
          },
          block.text
        )
      }
      return jsx(
        'span',
        { key: index, style: { color: '#c9d1d9', fontSize: 14, lineHeight: 23 } },
        block.text
      )
    })
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(
    Page,
    {
      title: 'Tardis Docs',
      subtitle: 'Markdown word processor · local persistence',
      actions: [
        jsx(Button, { label: 'New', onClick: newDoc }),
        jsx(Button, { label: 'Export .md', onClick: () => void exportDoc(), primary: true }),
      ],
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 14, flexGrow: 1, minHeight: 0 } },
      jsx(
        Card,
        {
          title: 'DOCUMENTS',
          children: [
            ...docs().map((doc) =>
              jsx(
                'div',
                {
                  key: doc.id,
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => setActiveId(doc.id),
                  style: () => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    padding: 8,
                    borderRadius: 6,
                    backgroundColor:
                      doc.id === activeId() ? '#1f2937' : 'transparent',
                  }),
                },
                jsx(
                  'div',
                  { style: { flexGrow: 1, gap: 2 } },
                  jsx(
                    'span',
                    {
                      style: {
                        color: doc.id === activeId() ? colors.text : colors.muted,
                        fontSize: 12,
                      },
                    },
                    titleOf(doc)
                  ),
                  jsx(
                    'span',
                    { style: { color: colors.dim, fontSize: 10 } },
                    `${wordCount(doc.content)} words`
                  )
                ),
                jsx(
                  'span',
                  {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `Delete ${doc.title}`,
                    onClick: () => remove(doc.id),
                    style: { color: colors.dim, fontSize: 14, padding: 4 },
                  },
                  '×'
                )
              )
            ),
          ],
        }
      ),
      jsx(
        'div',
        { style: { flexGrow: 2, flexDirection: 'column', gap: 8, minWidth: 0 } },
        jsx(TextField, {
          value: () => active().content,
          onChange: update,
          ariaLabel: 'Markdown editor',
          multiline: true,
          width: 560,
          wrap: false,
          rows: 30,
          fontFamily: mono,
          tabInserts: true,
          autoIndent: true,
          highlightLine: (line) => tokenize(line, 'markdown'),
        }),
        jsx(
          'div',
          {
            style: {
              flexDirection: 'row',
              gap: 14,
              color: colors.muted,
              fontSize: 11,
            },
          },
          jsx('span', {}, dynamic(() => `${wordCount(active().content)} words`)),
          jsx('span', {}, dynamic(() => `${readingMinutes(active().content)} min read`)),
          jsx('span', { style: { flexGrow: 1 } }, dynamic(() => status())),
          jsx('span', {}, 'markdown · UTF-8')
        )
      ),
      jsx(
        Card,
        {
          title: 'PREVIEW',
          grow: true,
          children: [dynamic(() => jsx(Preview, { source: active().content }))],
        }
      )
    )
  )
}

render(() => jsx(App))
