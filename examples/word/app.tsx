import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  pasteClipboard,
  render,
  ScrollView,
  TextField,
  writeClipboard,
  type SceneNode,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  BigCommand,
  Icon,
  OfficeApp,
  Ribbon,
  RibbonGroup,
  SmallCommand,
  office,
  type Accent,
} from '../shared/office'
import { parseMarkdown, readingMinutes, wordCount, type Block } from './markdown'

interface Doc {
  id: string
  title: string
  content: string
}

const ACCENT: Accent = accents.word
const STORAGE_KEY = 'tardis-ts.word.documents.v2'
const MONO = 'monospace'
const SERIF = 'serif'
const PAGE_WIDTH = 620

const seed: Doc[] = [
  {
    id: 'review',
    title: 'Q4 Business Review.md',
    content: `# Q4 Business Review

Prepared for the leadership team · November 2026

## Executive summary

Revenue closed at **$24,196** for the quarter, up 12% on the prior period.
Gross margin held at **38%**, two points below the plan, while units shipped
grew on the back of Widget Pro and the new services bundle.

The team is recommending a modest price increase in Q1 and a reallocation of
delivery capacity toward the two regions with the strongest demand.

## Performance

| Metric | Q4 | Q1 target |
| --- | --- | --- |
| Revenue | 24,196 | 28,551 |
| Gross margin | 38.0% | 40.0% |
| Units shipped | 506 | 560 |
| Active accounts | 86 | 96 |

## What changed

- Widget Pro now carries 41% of revenue, up from 33%.
- Services attach rate reached 62% in the West region.
- Delivery cost per order fell by 4% after the routing change.

## Risks

1. Unit price is flat while component costs rose 3%.
2. The East region is one account away from concentration risk.
3. Hiring two support roles would protect the Q1 ramp.

> The quarter is healthy, but the margin target depends on the price decision
> landing in January.

## Next steps

- Approve the Q1 price schedule by 6 December.
- Move two delivery pods to the West region.
- Reforecast margin after the first four weeks.

---

*Prepared by Dana Archer · Finance · Tardis Labs*`,
  },
  {
    id: 'release',
    title: 'Release notes.md',
    content: `# Tardis TS 2.0

## Alpha 2

- Native and web targets from one TSX entry
- Spreadsheet, editor, paint, and docs examples
- Formula engine and markdown rendering
- Local persistence on both hosts

## Known limits

1. Pointer caret placement is not implemented.
2. Native file dialogs are not available.
3. Streaming SSR is not implemented.
`,
  },
  {
    id: 'meeting',
    title: 'Meeting notes.md',
    content: `# Product review

## Agenda

- Q4 close
- Q1 plan
- Example suite quality

## Decisions

- Ship the office-quality example pass first.
- Keep benchmarks fixed after measurement.
- Publish the losses.

## Actions

- [ ] Review the ribbon spacing at 1280 px
- [ ] Add the Word source pane
- [ ] Check native rendering on Linux
`,
  },
]

function load(): Doc[] {
  if (typeof localStorage === 'undefined') return seed
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return seed
    const parsed = JSON.parse(stored) as Doc[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seed
    return parsed.filter(
      (doc) =>
        doc &&
        typeof doc.id === 'string' &&
        typeof doc.title === 'string' &&
        typeof doc.content === 'string'
    )
  } catch {
    return seed
  }
}

const [docs, setDocs] = createSignal<Doc[]>(load())
const [activeId, setActiveId] = createSignal(docs()[0]!.id)
const [status, setStatus] = createSignal('Saved locally')
const [query, setQuery] = createSignal('')
const [sourceOpen, setSourceOpen] = createSignal(false)
const [navOpen, setNavOpen] = createSignal(true)
const [rulerOn, setRulerOn] = createSignal(true)
const [margin, setMargin] = createSignal(64)
const [spacing, setSpacing] = createSignal(1.15)
const [bodySize, setBodySize] = createSignal(16)
const [caret, setCaret] = createSignal(0)
const [tab, setTab] = createSignal('home')
const [viewportH, setViewportH] = createSignal(
  typeof window !== 'undefined' ? window.innerHeight : 800
)

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => setViewportH(window.innerHeight))
}

function active(): Doc {
  return docs().find((doc) => doc.id === activeId()) ?? docs()[0]!
}

function titleOf(doc: Doc): string {
  return doc.title
}

function persist(next: Doc[], message = 'Saved locally'): void {
  setDocs(next)
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
    setStatus(message)
  } catch {
    setStatus('Memory only — storage is unavailable')
  }
}

function update(content: string): void {
  persist(
    docs().map((doc) => (doc.id === activeId() ? { ...doc, content } : doc)),
    'Saved locally'
  )
}

function selectDoc(id: string): void {
  setActiveId(id)
  setCaret(0)
  const doc = docs().find((entry) => entry.id === id)
  setStatus(doc ? `Opened ${doc.title}` : 'Document selected')
}

function newDoc(): void {
  const id = `doc-${Date.now()}`
  const doc: Doc = { id, title: 'Untitled.md', content: '# Untitled\n\nStart writing…' }
  persist([...docs(), doc], 'New document created')
  setActiveId(id)
  setCaret(0)
  setSourceOpen(true)
}

function removeDoc(id: string): void {
  if (docs().length === 1) {
    setStatus('The last document cannot be deleted')
    return
  }
  const next = docs().filter((doc) => doc.id !== id)
  persist(next, 'Document deleted')
  if (activeId() === id) setActiveId(next[0]!.id)
}

function ensureSource(): boolean {
  if (!sourceOpen()) {
    setSourceOpen(true)
    setStatus('Source opened — place the caret, then run the command again')
    return false
  }
  return true
}

function insertAtCaret(text: string): void {
  if (!ensureSource()) return
  const doc = active()
  const at = Math.min(caret(), doc.content.length)
  update(doc.content.slice(0, at) + text + doc.content.slice(at))
  setCaret(at + text.length)
}

function wrapAtCaret(marker: string, placeholder: string): void {
  insertAtCaret(`${marker}${placeholder}${marker}`)
  setStatus('Replace the placeholder text')
}

function currentLine(): { start: number; end: number; text: string } {
  const text = active().content
  const at = Math.min(caret(), text.length)
  const start = text.lastIndexOf('\n', Math.max(0, at - 1)) + 1
  const next = text.indexOf('\n', at)
  const end = next === -1 ? text.length : next
  return { start, end, text: text.slice(start, end) }
}

function applyLinePrefix(prefix: string): void {
  if (!ensureSource()) return
  const doc = active()
  const line = currentLine()
  const bare = line.text.replace(/^(#{1,3}\s+|[-*+]\s+|\d+\.\s+|>\s?)/, '')
  const next =
    doc.content.slice(0, line.start) +
    prefix +
    bare +
    doc.content.slice(line.end)
  update(next)
  setCaret(line.start + prefix.length)
  setStatus(prefix === '' ? 'Normal style applied' : `${prefix.trim()} style applied`)
}

function insertBlock(text: string): void {
  insertAtCaret(`\n\n${text}\n\n`)
  setStatus('Block inserted')
}

function activeStyle(): string {
  const line = currentLine().text
  if (/^###\s/.test(line)) return 'h3'
  if (/^##\s/.test(line)) return 'h2'
  if (/^#\s/.test(line)) return 'h1'
  return 'normal'
}

function copyAll(): void {
  writeClipboard(active().content)
  setStatus('Document copied')
}

function save(): void {
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(docs()))
    setStatus('Saved to this device')
  } catch {
    setStatus('Save is unavailable in this host')
  }
}

function exportDoc(): void {
  const doc = active()
  writeClipboard(doc.content)
  if (typeof document !== 'undefined') {
    const anchor = document.createElement('a')
    anchor.href = `data:text/markdown;charset=utf-8,${encodeURIComponent(doc.content)}`
    anchor.download = doc.title
    anchor.click()
  }
  setStatus('Exported markdown')
}

function printDoc(): void {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
    setStatus('Print dialog opened')
  } else {
    setStatus('Printing is available on the web build')
  }
}

function openLink(url: string): void {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener')
    setStatus(`Opened ${url}`)
  } else {
    setStatus(`Link: ${url}`)
  }
}

function underlineText(value: string): string {
  return [...value].map((char) => `${char}\u0332`).join('')
}

function inline(text: string, base: Record<string, unknown>): SceneNode[] {
  interface Run {
    text: string
    style: Record<string, unknown>
    onClick?: () => void
    underline?: boolean
  }
  const runs: Run[] = []
  const push = (
    value: string,
    style: Record<string, unknown>,
    onClick?: () => void,
    underline = false
  ): void => {
    if (value !== '') runs.push({ text: value, style, onClick, underline })
  }
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|<u>[^<]+<\/u>)/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    if (match.index > last) push(text.slice(last, match.index), base)
    const token = match[0]
    if (token.startsWith('**')) {
      push(token.slice(2, -2), { ...base, fontWeight: 700 })
    } else if (token.startsWith('`')) {
      push(token.slice(1, -1), {
        ...base,
        fontFamily: MONO,
        fontSize: Number(base.fontSize ?? 15) - 2,
        backgroundColor: '#f3f2f1',
        color: '#8b1e3f',
      })
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (link) {
        push(
          link[1]!,
          { ...base, color: ACCENT.main },
          () => openLink(link[2]!),
          true
        )
      }
    } else if (token.startsWith('<u>')) {
      push(token.slice(3, -4), base, undefined, true)
    } else {
      push(token.slice(1, -1), { ...base, fontStyle: 'italic' })
    }
    last = match.index + token.length
  }
  if (last < text.length) push(text.slice(last), base)

  const nodes: SceneNode[] = []
  for (const run of runs) {
    const leading = /^\s+/.exec(run.text)?.[0] ?? ''
    if (leading !== '') {
      const previous = nodes[nodes.length - 1]
      if (previous) previous.text += leading
      else {
        nodes.push(
          jsx(
            'span',
            { style: { ...run.style, whiteSpace: 'pre' } },
            leading
          )
        )
      }
    }
    const words = run.text.match(/\S+\s*/g) ?? []
    for (const word of words) {
      const value = run.underline ? underlineText(word) : word
      nodes.push(
        jsx(
          'span',
          {
            style: run.style,
            ...(run.onClick ? { role: 'link', tabIndex: 0, onClick: run.onClick } : {}),
          },
          value
        )
      )
    }
  }
  return nodes
}

function PageTable(props: { rows: string[][] }): SceneNode {
  const [head, ...body] = props.rows
  if (!head) return jsx('div', {})
  const cell = (value: string, header: boolean, key: string): SceneNode =>
    jsx(
      'div',
      {
        key,
        style: {
          flexGrow: 1,
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 7,
          paddingRight: 7,
          borderWidth: 1,
          borderColor: office.borderSoft,
          backgroundColor: header ? office.chromeAlt : office.surface,
        },
      },
      jsx(
        'span',
        {
          style: {
            fontFamily: SERIF,
            fontSize: 12.5,
            fontWeight: header ? 700 : 400,
            color: office.ink,
            lineHeight: 17,
          },
        },
        value
      )
    )
  return jsx(
    'div',
    { style: { flexDirection: 'column', marginTop: 8, marginBottom: 12 } },
    jsx(
      'div',
      { style: { flexDirection: 'row' } },
      ...head.map((value, index) => cell(value, true, `h-${index}`))
    ),
    ...body.map((row, rowIndex) =>
      jsx(
        'div',
        { key: rowIndex, style: { flexDirection: 'row' } },
        ...row.map((value, index) => cell(value, false, `${rowIndex}-${index}`))
      )
    )
  )
}

function PageContent(): SceneNode {
  const doc = active()
  const blocks = parseMarkdown(doc.content)
  const body = {
    fontFamily: SERIF,
    fontSize: bodySize(),
    lineHeight: Math.round(bodySize() * 1.5 * spacing()),
    color: '#262626',
  }
  return jsx(
    'div',
    { style: { flexGrow: 1 } },
    ...blocks.map((block: Block, index) => {
      if (block.type === 'h1') {
        return jsx(
          'p',
          { key: index, style: { marginTop: 2, marginBottom: 10, flexWrap: 'wrap' } },
          ...inline(block.text, {
            fontFamily: SERIF,
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 38,
            color: '#1b1b1b',
          })
        )
      }
      if (block.type === 'h2') {
        return jsx(
          'p',
          { key: index, style: { marginTop: 16, marginBottom: 7, flexWrap: 'wrap' } },
          ...inline(block.text, {
            fontFamily: SERIF,
            fontSize: 23,
            fontWeight: 700,
            lineHeight: 29,
            color: ACCENT.dark,
          })
        )
      }
      if (block.type === 'h3') {
        return jsx(
          'p',
          { key: index, style: { marginTop: 12, marginBottom: 5, flexWrap: 'wrap' } },
          ...inline(block.text, {
            fontFamily: SERIF,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 24,
            color: office.ink,
          })
        )
      }
      if (block.type === 'li') {
        return jsx(
          'div',
          {
            key: index,
            style: {
              flexDirection: 'row',
              gap: 8,
              marginBottom: 3,
              paddingLeft: 6,
            },
          },
          jsx(
            'span',
            {
              style: {
                width: block.marker === '•' ? 12 : 20,
                fontFamily: SERIF,
                fontSize: bodySize(),
                lineHeight: body.lineHeight,
                color: ACCENT.main,
                textAlign: 'right',
              },
            },
            block.marker ?? '•'
          ),
          jsx('p', { style: { flexGrow: 1, flexWrap: 'wrap', marginTop: 0, marginBottom: 0 } }, ...inline(block.text, body))
        )
      }
      if (block.type === 'quote') {
        return jsx(
          'div',
          {
            key: index,
            style: {
              paddingLeft: 14,
              paddingTop: 3,
              paddingBottom: 3,
              marginTop: 8,
              marginBottom: 10,
              borderColor: ACCENT.main,
              borderWidth: 2,
              backgroundColor: '#f7f9fc',
            },
          },
          ...inline(block.text, {
            ...body,
            fontStyle: 'italic',
            color: office.muted,
          })
        )
      }
      if (block.type === 'code') {
        return jsx(
          'div',
          {
            key: index,
            style: {
              padding: 10,
              marginTop: 6,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: office.borderSoft,
              backgroundColor: '#f8f8f8',
            },
          },
          jsx(
            'span',
            {
              style: {
                fontFamily: MONO,
                fontSize: 11.5,
                lineHeight: 18,
                color: '#24292f',
                whiteSpace: 'pre',
              },
            },
            block.text
          )
        )
      }
      if (block.type === 'table') {
        return jsx(PageTable, { key: index, rows: block.rows ?? [] })
      }
      if (block.type === 'rule') {
        return jsx('div', {
          key: index,
          style: {
            height: 1,
            backgroundColor: office.border,
            marginTop: 14,
            marginBottom: 14,
          },
        })
      }
      return jsx(
        'p',
        { key: index, style: { marginTop: 0, marginBottom: 8, flexWrap: 'wrap' } },
        ...inline(block.text, body)
      )
    }),
    jsx(
      'div',
      {
        style: {
          marginTop: 22,
          paddingTop: 8,
          borderColor: office.borderSoft,
          borderWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
      },
      jsx(
        'span',
        { style: { fontFamily: SERIF, fontSize: 9.5, color: office.dim } },
        'Tardis Labs · Internal'
      ),
      jsx(
        'span',
        { style: { fontFamily: SERIF, fontSize: 9.5, color: office.dim } },
        'Page 1'
      )
    )
  )
}

function Ruler(): SceneNode {
  const ticks = Array.from({ length: 26 }, (_, index) => index)
  return jsx(
    'div',
    {
      style: {
        width: PAGE_WIDTH,
        height: 20,
        flexDirection: 'row',
        backgroundColor: office.chromeAlt,
        borderWidth: 1,
        borderColor: office.borderSoft,
      },
    },
    ...ticks.map((tick) =>
      jsx(
        'div',
        {
          key: tick,
          style: {
            width: 24,
            height: 20,
            justifyContent: 'flex-end',
            alignItems: 'center',
          },
        },
        tick % 4 === 0
          ? jsx(
              'span',
              { style: { fontSize: 8, color: office.dim, lineHeight: 10 } },
              String(tick)
            )
          : jsx('div', {
              style: { width: 1, height: 4, backgroundColor: office.border },
            })
      )
    )
  )
}

function PageToolbar(): SceneNode {
  const toggle = (
    label: string,
    active: boolean,
    onClick: () => void
  ): SceneNode =>
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        onClick,
        style: {
          height: 22,
          paddingLeft: 9,
          paddingRight: 9,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? ACCENT.tint : 'transparent',
          borderWidth: 1,
          borderColor: active ? ACCENT.main : 'transparent',
          borderRadius: 2,
        },
      },
      jsx(
        'span',
        {
          style: {
            fontSize: 10.5,
            color: active ? ACCENT.dark : office.muted,
            fontWeight: active ? 600 : 400,
          },
        },
        label
      )
    )
  return jsx(
    'div',
    {
      style: {
        height: 31,
        minHeight: 31,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 14,
        paddingRight: 10,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 10.5, color: office.muted } },
      sourceOpen() ? 'EDITING MARKDOWN SOURCE' : 'READING VIEW'
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'span',
      { style: { fontSize: 10.5, color: office.muted } },
      `${wordCount(active().content)} words · ${readingMinutes(active().content)} min read`
    ),
    toggle('Reading view', !sourceOpen(), () => {
      setSourceOpen(false)
      setStatus('Reading view')
    }),
    toggle('Edit source', sourceOpen(), () => {
      setSourceOpen(true)
      setStatus('Markdown source open')
    })
  )
}

function NavigationPane(): SceneNode {
  const filtered = (): Doc[] => {
    const text = query().trim().toLowerCase()
    if (text === '') return docs()
    return docs().filter(
      (doc) =>
        doc.title.toLowerCase().includes(text) ||
        doc.content.toLowerCase().includes(text)
    )
  }
  return jsx(
    'div',
    {
      style: {
        width: 214,
        minWidth: 214,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { padding: 10, gap: 6 } },
      jsx(
        'span',
        { style: { fontSize: 12, fontWeight: 600, color: office.ink } },
        'Navigation'
      ),
      jsx(TextField, {
        value: () => query(),
        onChange: setQuery,
        ariaLabel: 'Search documents',
        width: 188,
        height: 26,
        padding: 4,
        lineHeight: 16,
        fontSize: 11,
        backgroundColor: office.surface,
        color: office.ink,
        placeholderColor: office.dim,
        selectionColor: ACCENT.tint,
        caretColor: ACCENT.main,
        borderWidth: 1,
        borderColor: office.border,
        borderRadius: 2,
        placeholder: 'Search documents',
      }),
      jsx(
        'span',
        {
          style: {
            fontSize: 9.5,
            color: office.muted,
            marginTop: 4,
          },
        },
        'DOCUMENTS'
      )
    ),
    jsx(
      'div',
      { style: { flexDirection: 'column', gap: 2, paddingLeft: 6, paddingRight: 6 } },
      ...filtered().map((doc) =>
        jsx(
          'div',
          {
            key: doc.id,
            role: 'button',
            tabIndex: 0,
            onClick: () => selectDoc(doc.id),
            style: {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingTop: 5,
              paddingBottom: 5,
              paddingLeft: 6,
              paddingRight: 6,
              borderRadius: 2,
              backgroundColor:
                doc.id === activeId() ? ACCENT.tint : 'transparent',
              borderWidth: 1,
              borderColor:
                doc.id === activeId() ? ACCENT.main : 'transparent',
            },
          },
          jsx(Icon, {
            name: 'page',
            size: 14,
            color: doc.id === activeId() ? ACCENT.main : office.muted,
          }),
          jsx(
            'div',
            { style: { flexGrow: 1, gap: 1 } },
            jsx(
              'span',
              {
                style: {
                  fontSize: 11,
                  color: doc.id === activeId() ? ACCENT.dark : office.ink,
                  fontWeight: doc.id === activeId() ? 600 : 400,
                  whiteSpace: 'nowrap',
                },
              },
              titleOf(doc)
            ),
            jsx(
              'span',
              { style: { fontSize: 9, color: office.dim } },
              `${wordCount(doc.content)} words`
            )
          ),
          doc.id === activeId()
            ? jsx(
                'span',
                {
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': `Delete ${doc.title}`,
                  onClick: () => removeDoc(doc.id),
                  style: { fontSize: 12, color: office.dim, padding: 2 },
                },
                '×'
              )
            : null
        )
      ),
      filtered().length === 0
        ? jsx(
            'span',
            { style: { fontSize: 10, color: office.dim, padding: 8 } },
            'No matching documents'
          )
        : null
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'div',
      {
        style: {
          padding: 10,
          gap: 8,
          borderColor: office.borderSoft,
          borderWidth: 1,
        },
      },
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: newDoc,
          style: {
            height: 26,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ACCENT.main,
            borderRadius: 2,
          },
        },
        jsx('span', { style: { fontSize: 11, color: '#ffffff', fontWeight: 600 } }, '+ New document')
      ),
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.muted } },
        dynamic(() => `${docs().length} documents · local storage`)
      )
    )
  )
}

function SourcePane(): SceneNode {
  const lineInfo = (): string => {
    const text = active().content
    const at = Math.min(caret(), text.length)
    const before = text.slice(0, at)
    const line = before.split('\n').length
    const column = at - before.lastIndexOf('\n')
    return `Ln ${line}, Col ${column}`
  }
  return jsx(
    'div',
    {
      style: {
        width: 344,
        minWidth: 344,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      {
        style: {
          height: 28,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 10,
          paddingRight: 8,
          borderColor: office.borderSoft,
          borderWidth: 1,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted, flexGrow: 1 } },
        'MARKDOWN SOURCE'
      ),
      jsx(
        'span',
        {
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Close source pane',
          onClick: () => setSourceOpen(false),
          style: { fontSize: 14, color: office.dim, padding: 3 },
        },
        '×'
      )
    ),
    jsx(
      'div',
      { style: { padding: 8, flexGrow: 1, minHeight: 0 } },
      jsx(TextField, {
        value: () => active().content,
        onChange: update,
        onCaretChange: setCaret,
        ariaLabel: 'Markdown source',
        multiline: true,
        rows: 28,
        height: Math.max(280, viewportH() - 300),
        width: 326,
        padding: 8,
        lineHeight: 19,
        fontSize: 12,
        fontFamily: MONO,
        backgroundColor: office.surface,
        color: office.ink,
        placeholderColor: office.dim,
        selectionColor: ACCENT.tint,
        caretColor: ACCENT.main,
        borderWidth: 1,
        borderColor: office.border,
        borderRadius: 0,
        tabInserts: true,
        autoIndent: true,
      })
    ),
    jsx(
      'div',
      {
        style: {
          height: 22,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 10,
          borderColor: office.borderSoft,
          borderWidth: 1,
        },
      },
      jsx('span', { style: { fontSize: 9.5, color: office.muted, flexGrow: 1 } }, dynamic(() => lineInfo())),
      jsx('span', { style: { fontSize: 9.5, color: office.muted } }, 'Markdown')
    )
  )
}

function homeRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Clipboard',
        children: [
          jsx(BigCommand, {
            icon: 'paste',
            label: 'Paste',
            accent: ACCENT,
            onClick: () =>
              pasteClipboard((text) => {
                insertAtCaret(text)
              }),
          }),
          jsx(SmallCommand, {
            icon: 'copy',
            label: 'Copy all',
            accent: ACCENT,
            onClick: copyAll,
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Font',
        children: [
          jsx(
            'div',
            { style: { flexDirection: 'column', gap: 2 } },
            jsx(
              'div',
              { style: { flexDirection: 'row', gap: 1 } },
              jsx(SmallCommand, {
                icon: 'bold',
                onClick: () => wrapAtCaret('**', 'bold'),
                accent: ACCENT,
              }),
              jsx(SmallCommand, {
                icon: 'italic',
                onClick: () => wrapAtCaret('*', 'italic'),
                accent: ACCENT,
              }),
              jsx(SmallCommand, {
                icon: 'underline',
                onClick: () => {
                  if (!ensureSource()) return
                  insertAtCaret('<u>underline</u>')
                  setStatus('Replace the placeholder text')
                },
                accent: ACCENT,
              })
            ),
            jsx(
              'div',
              { style: { flexDirection: 'row', gap: 1, alignItems: 'center' } },
              jsx(SmallCommand, {
                icon: 'minus',
                onClick: () => setBodySize((value) => Math.max(12, value - 1)),
                accent: ACCENT,
              }),
              jsx(
                'div',
                {
                  style: {
                    width: 24,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: office.border,
                    backgroundColor: office.surface,
                  },
                },
                jsx('span', { style: { fontSize: 10, color: office.ink } }, String(bodySize()))
              ),
              jsx(SmallCommand, {
                icon: 'plus',
                onClick: () => setBodySize((value) => Math.min(24, value + 1)),
                accent: ACCENT,
              })
            )
          ),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Styles',
        children: [
          jsx(SmallCommand, {
            icon: 'page',
            label: 'Normal',
            accent: ACCENT,
            onClick: () => applyLinePrefix(''),
            active: activeStyle() === 'normal',
            width: 66,
          }),
          jsx(SmallCommand, {
            icon: 'font',
            label: 'Title',
            accent: ACCENT,
            onClick: () => applyLinePrefix('# '),
            active: activeStyle() === 'h1',
            width: 58,
          }),
          jsx(SmallCommand, {
            icon: 'font',
            label: 'Heading 1',
            accent: ACCENT,
            onClick: () => applyLinePrefix('## '),
            active: activeStyle() === 'h2',
            width: 76,
          }),
          jsx(SmallCommand, {
            icon: 'font',
            label: 'Heading 2',
            accent: ACCENT,
            onClick: () => applyLinePrefix('### '),
            active: activeStyle() === 'h3',
            width: 76,
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Paragraph',
        children: [
          jsx(SmallCommand, {
            icon: 'list',
            label: 'Bullets',
            accent: ACCENT,
            onClick: () => applyLinePrefix('- '),
          }),
          jsx(SmallCommand, {
            icon: 'list',
            label: 'Numbering',
            accent: ACCENT,
            onClick: () => applyLinePrefix('1. '),
          }),
          jsx(SmallCommand, {
            icon: 'comment',
            label: 'Quote',
            accent: ACCENT,
            onClick: () => applyLinePrefix('> '),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Editing',
        children: [
          jsx(BigCommand, {
            icon: 'page',
            label: sourceOpen() ? 'Close source' : 'Edit source',
            accent: ACCENT,
            onClick: () => setSourceOpen((value) => !value),
            active: sourceOpen(),
          }),
          jsx(SmallCommand, {
            icon: 'search',
            label: 'Find',
            accent: ACCENT,
            disabled: true,
          }),
        ],
      }),
    ],
  })
}

function insertRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Tables',
        children: [
          jsx(BigCommand, {
            icon: 'table',
            label: 'Table',
            accent: ACCENT,
            onClick: () =>
              insertBlock(
                '| Column | Value | Notes |\n| --- | --- | --- |\n| Revenue | 0 | |\n| Margin | 0% | |'
              ),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Links & code',
        children: [
          jsx(SmallCommand, {
            icon: 'page',
            label: 'Link',
            accent: ACCENT,
            onClick: () => insertAtCaret('[link text](https://example.com)'),
          }),
          jsx(SmallCommand, {
            icon: 'formula',
            label: 'Code block',
            accent: ACCENT,
            onClick: () => insertBlock('```\ncode\n```'),
          }),
          jsx(SmallCommand, {
            icon: 'minus',
            label: 'Divider',
            accent: ACCENT,
            onClick: () => insertBlock('---'),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Illustrations',
        children: [
          jsx(BigCommand, { icon: 'picture', label: 'Pictures', accent: ACCENT, disabled: true }),
          jsx(BigCommand, { icon: 'chart', label: 'Chart', accent: ACCENT, disabled: true }),
        ],
      }),
    ],
  })
}

function layoutRibbon(): SceneNode {
  const marginButton = (label: string, value: number): SceneNode =>
    jsx(SmallCommand, {
      icon: 'page',
      label,
      accent: ACCENT,
      active: margin() === value,
      onClick: () => {
        setMargin(value)
        setStatus(`${label} margins`)
      },
    })
  const spacingButton = (label: string, value: number): SceneNode =>
    jsx(SmallCommand, {
      icon: 'list',
      label,
      accent: ACCENT,
      active: spacing() === value,
      onClick: () => {
        setSpacing(value)
        setStatus(`${label} line spacing`)
      },
    })
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Page setup',
        children: [
          marginButton('Narrow', 34),
          marginButton('Normal', 64),
          marginButton('Wide', 90),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Paragraph spacing',
        children: [
          spacingButton('1.0', 1),
          spacingButton('1.15', 1.15),
          spacingButton('1.5', 1.5),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Show',
        children: [
          jsx(BigCommand, {
            icon: 'table',
            label: 'Ruler',
            accent: ACCENT,
            active: rulerOn(),
            onClick: () => setRulerOn((value) => !value),
          }),
        ],
      }),
    ],
  })
}

function reviewRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Proofing',
        children: [
          jsx(BigCommand, {
            icon: 'check',
            label: `${wordCount(active().content)} words`,
            accent: ACCENT,
            onClick: () => setStatus(`${wordCount(active().content)} words`),
          }),
          jsx(BigCommand, {
            icon: 'calendar',
            label: `${readingMinutes(active().content)} min read`,
            accent: ACCENT,
            onClick: () => setStatus(`${readingMinutes(active().content)} minute read`),
          }),
          jsx(SmallCommand, {
            icon: 'search',
            label: 'Spelling',
            accent: ACCENT,
            disabled: true,
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Comments',
        children: [
          jsx(BigCommand, { icon: 'comment', label: 'New comment', accent: ACCENT, disabled: true }),
        ],
      }),
    ],
  })
}

function viewRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Show',
        children: [
          jsx(BigCommand, {
            icon: 'list',
            label: 'Navigation',
            accent: ACCENT,
            active: navOpen(),
            onClick: () => setNavOpen((value) => !value),
          }),
          jsx(BigCommand, {
            icon: 'page',
            label: 'Source',
            accent: ACCENT,
            active: sourceOpen(),
            onClick: () => setSourceOpen((value) => !value),
          }),
          jsx(BigCommand, {
            icon: 'table',
            label: 'Ruler',
            accent: ACCENT,
            active: rulerOn(),
            onClick: () => setRulerOn((value) => !value),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Window',
        children: [
          jsx(SmallCommand, {
            icon: 'grid',
            label: 'Focus mode',
            accent: ACCENT,
            onClick: () => {
              setNavOpen(false)
              setSourceOpen(false)
              setStatus('Focus mode — panes hidden')
            },
          }),
        ],
      }),
    ],
  })
}

function fileRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Document',
        children: [
          jsx(BigCommand, { icon: 'page', label: 'New', accent: ACCENT, onClick: newDoc }),
          jsx(BigCommand, { icon: 'save', label: 'Save', accent: ACCENT, onClick: save }),
          jsx(BigCommand, { icon: 'print', label: 'Print', accent: ACCENT, onClick: printDoc }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Export',
        children: [
          jsx(BigCommand, { icon: 'table', label: 'Export .md', accent: ACCENT, onClick: exportDoc }),
          jsx(SmallCommand, { icon: 'copy', label: 'Copy all', accent: ACCENT, onClick: copyAll }),
        ],
      }),
    ],
  })
}

function renderRibbon(tab: string): SceneNode {
  if (tab === 'file') return fileRibbon()
  if (tab === 'insert') return insertRibbon()
  if (tab === 'layout') return layoutRibbon()
  if (tab === 'review') return reviewRibbon()
  if (tab === 'view') return viewRibbon()
  return homeRibbon()
}

function App(): ReturnType<typeof jsx> {
  const canvasHeight = (): number =>
    Math.max(320, viewportH() - (rulerOn() ? 218 : 198))
  return jsx(OfficeApp, {
    app: 'Tardis Word',
    initial: 'W',
    file: () => active().title,
    accent: ACCENT,
    tabs: ['File', 'Home', 'Insert', 'Layout', 'Review', 'View'],
    activeTab: () => tab(),
    onTab: (name) => setTab(name),
    renderRibbon,
    statusLeft: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => status())
    ),
    statusCenter: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(
        () =>
          `Page 1 of 1 · ${wordCount(active().content)} words · ${readingMinutes(
            active().content
          )} min`
      )
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      'English (United States)'
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        dynamic(() => (navOpen() ? jsx(NavigationPane, {}) : null)),
        jsx(
          'div',
          {
            style: {
              flexGrow: 1,
              flexDirection: 'column',
              minWidth: 0,
              backgroundColor: '#e6e6e6',
            },
          },
          dynamic(() => jsx(PageToolbar, {})),
          dynamic(() =>
            rulerOn()
              ? jsx(
                  'div',
                  {
                    style: {
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  },
                  jsx(Ruler, {})
                )
              : null
          ),
          jsx(ScrollView, {
            height: canvasHeight(),
            contentHeight: 860,
            showScrollbar: false,
            children: [
              jsx(
                'div',
                {
                  style: {
                    paddingTop: 14,
                    paddingBottom: 26,
                    alignItems: 'center',
                  },
                },
                jsx(
                  'div',
                  {
                    style: {
                      width: PAGE_WIDTH,
                      minHeight: 760,
                      padding: margin(),
                      gap: 2,
                      backgroundColor: office.surface,
                      borderWidth: 1,
                      borderColor: office.border,
                    },
                  },
                  dynamic(() => jsx(PageContent, {}))
                )
              ),
            ],
          })
        ),
        dynamic(() => (sourceOpen() ? jsx(SourcePane, {}) : null))
      ),
    ],
  })
}

render(() => jsx(App))
