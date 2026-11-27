import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
} from '@devansharora18/tardis-ts/scene'
import { Badge, Button, Card, Page } from '../shared/ui'
import { colors } from '../shared/theme'

interface PageInfo {
  index: number
  rotation: number
  preview: string
  width: number
  height: number
}

const [bytes, setBytes] = createSignal<Uint8Array | null>(null)
const [pages, setPages] = createSignal<PageInfo[]>([])
const [order, setOrder] = createSignal<number[]>([])
const [selected, setSelected] = createSignal(0)
const [note, setNote] = createSignal('Reviewed')
const [status, setStatus] = createSignal('Load a PDF to begin')
const [loading, setLoading] = createSignal(false)
const [error, setError] = createSignal('')

const web = typeof document !== 'undefined'

const importExternal = async (url: string): Promise<any> =>
  // Keep the URL out of the bundler: native never executes this branch.
  (new Function('url', 'return import(url)') as (url: string) => Promise<any>)(url)

const renderPage = async (
  pdf: { getPage: (index: number) => Promise<any> },
  index: number,
  scale: number
): Promise<{ preview: string; width: number; height: number }> => {
  const page = await pdf.getPage(index)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d')!
  await page.render({ canvasContext: context, viewport }).promise
  return {
    preview: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
  }
}

const load = async (file: File): Promise<void> => {
  if (!web) return
  setLoading(true)
  setError('')
  setStatus(`Loading ${file.name}…`)
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    setBytes(data)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'
    const pdf = await pdfjs.getDocument({ data: data.slice(0) }).promise
    const next: PageInfo[] = []
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await renderPage(pdf, index, 0.8)
      next.push({ index: index - 1, rotation: 0, ...page })
    }
    setPages(next)
    setOrder(next.map((page) => page.index))
    setSelected(0)
    setStatus(`${pdf.numPages} pages loaded`)
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : String(reason))
    setStatus('Load failed')
  } finally {
    setLoading(false)
  }
}

const choose = (): void => {
  if (!web) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/pdf,.pdf'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) void load(file)
  })
  input.click()
}

const rotate = (): void => {
  const index = order()[selected()]
  if (index === undefined) return
  setPages((items) =>
    items.map((page) =>
      page.index === index ? { ...page, rotation: (page.rotation + 90) % 360 } : page
    )
  )
}

const remove = (): void => {
  const next = order().filter((_, position) => position !== selected())
  setOrder(next)
  setSelected(Math.max(0, Math.min(selected(), next.length - 1)))
}

const move = (direction: -1 | 1): void => {
  const list = [...order()]
  const from = selected()
  const to = from + direction
  if (to < 0 || to >= list.length) return
  ;[list[from], list[to]] = [list[to]!, list[from]!]
  setOrder(list)
  setSelected(to)
}

const exportPdf = async (): Promise<void> => {
  const data = bytes()
  if (!data || order().length === 0) return
  setLoading(true)
  try {
    const lib = await importExternal(
      'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.min.js'
    )
    const source = await lib.PDFDocument.load(data)
    const output = await lib.PDFDocument.create()
    const copies = await output.copyPages(source, order())
    const font = await output.embedFont(lib.StandardFonts.Helvetica)
    copies.forEach((page: any, position: number) => {
      const rotation = pages().find(
        (entry) => entry.index === order()[position]
      )?.rotation
      if (rotation) page.setRotation(lib.degrees(rotation))
      if (position === selected() && note().trim() !== '') {
        page.drawText(note().trim(), {
          x: 36,
          y: 28,
          size: 10,
          font,
          color: lib.rgb(0.2, 0.4, 0.9),
        })
      }
      output.addPage(page)
    })
    const saved = await output.save()
    const blob = new Blob([saved], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tardis-edited.pdf'
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus(`Exported ${order().length} pages`)
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : String(reason))
  } finally {
    setLoading(false)
  }
}

function App(): ReturnType<typeof jsx> {
  if (!web) {
    return jsx(Page, {
      title: 'Tardis PDF',
      subtitle: 'Web-only example',
      children: [
        jsx(Card, {
          title: 'DESKTOP BUILD',
          children: [
            jsx(
              'span',
              { style: { color: colors.muted, lineHeight: 20 } },
              'PDF parsing and rendering use browser APIs (PDF.js canvas and Blob downloads), so this example runs on the web target. The other 15 examples run on desktop and web.'
            ),
          ],
        }),
      ],
    })
  }

  const currentOrder = (): number | undefined => order()[selected()]
  const currentPage = (): PageInfo | undefined =>
    pages().find((page) => page.index === currentOrder())

  return jsx(
    Page,
    {
      title: 'Tardis PDF',
      subtitle: 'PDF.js preview · pdf-lib page operations',
      actions: [
        jsx(Button, { label: 'Open PDF', onClick: choose }),
        jsx(Button, { label: '← Move', onClick: () => move(-1) }),
        jsx(Button, { label: 'Move →', onClick: () => move(1) }),
        jsx(Button, { label: 'Rotate', onClick: rotate }),
        jsx(Button, { label: 'Delete', onClick: remove, danger: true }),
        jsx(Button, { label: 'Export', onClick: () => void exportPdf(), primary: true }),
      ],
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 14, flexGrow: 1, minHeight: 0 } },
      jsx(
        Card,
        {
          title: 'PAGES',
          children: [
            dynamic(() => {
              if (order().length === 0) {
                return jsx(
                  'span',
                  { style: { color: colors.muted, fontSize: 11 } },
                  'No PDF loaded'
                )
              }
              return order().map((pageIndex, position) => {
                const page = pages().find((entry) => entry.index === pageIndex)
                if (!page) return null
                return jsx(
                  'div',
                  {
                    key: `${pageIndex}`,
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => setSelected(position),
                    style: () => ({
                      flexDirection: 'row',
                      gap: 8,
                      alignItems: 'center',
                      padding: 6,
                      borderRadius: 6,
                      backgroundColor:
                        position === selected() ? '#1f2937' : 'transparent',
                    }),
                  },
                  jsx('img', {
                    src: page.preview,
                    style: { width: 52, height: 68, borderRadius: 2 },
                  }),
                  jsx(
                    'span',
                    { style: { color: colors.text, fontSize: 11 } },
                    `Page ${pageIndex + 1}`
                  ),
                  page.rotation
                    ? jsx(Badge, { label: `${page.rotation}°` })
                    : null
                )
              })
            }),
          ],
        }
      ),
      jsx(
        'div',
        {
          style: {
            flexGrow: 1,
            padding: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#05080d',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 0,
          },
        },
        dynamic(() => {
          if (loading()) {
            return jsx('span', { style: { color: colors.muted } }, 'Rendering…')
          }
          const page = currentPage()
          if (!page) {
            return jsx(
              'div',
              { style: { alignItems: 'center', gap: 10 } },
              jsx('span', { style: { color: colors.text, fontSize: 18 } }, 'Open a PDF'),
              jsx(
                'span',
                { style: { color: colors.muted, fontSize: 12 } },
                'Preview, reorder, rotate, annotate, and export.'
              ),
              jsx(Button, { label: 'Choose PDF', onClick: choose, primary: true })
            )
          }
          return jsx('img', {
            src: page.preview,
            style: {
              width: page.width,
              height: page.height,
              borderRadius: 4,
            },
          })
        })
      ),
      jsx(
        Card,
        {
          title: 'ANNOTATE',
          children: [
            jsx(TextField, {
              value: () => note(),
              onChange: setNote,
              ariaLabel: 'Annotation text',
              width: 200,
              placeholder: 'Footer annotation',
            }),
            jsx(
              'span',
              { style: { color: colors.muted, fontSize: 11, lineHeight: 16 } },
              'The note is drawn at the bottom-left of the selected page on export.'
            ),
            dynamic(() => jsx(Badge, { label: `${order().length} pages` })),
            jsx('span', { style: { color: colors.dim, fontSize: 11 } }, dynamic(() => status())),
            error()
              ? jsx('span', { style: { color: colors.red, fontSize: 11 } }, error())
              : null,
          ],
        }
      )
    )
  )
}

render(() => jsx(App))
