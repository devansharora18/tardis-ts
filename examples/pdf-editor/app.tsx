import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
  type SceneNode,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  DesktopApp,
  Icon,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

interface PageInfo {
  index: number
  rotation: number
  preview: string
  width: number
  height: number
}

const ACCENT: Accent = accents.access
const [bytes, setBytes] = createSignal<Uint8Array | null>(null)
const [pages, setPages] = createSignal<PageInfo[]>([])
const [order, setOrder] = createSignal<number[]>([])
const [selected, setSelected] = createSignal(0)
const [note, setNote] = createSignal('Reviewed')
const [fileName, setFileName] = createSignal('No document')
const [status, setStatus] = createSignal('Open a PDF to begin')
const [loading, setLoading] = createSignal(false)
const [error, setError] = createSignal('')
const [zoom, setZoom] = createSignal(0.7)

const web = typeof document !== 'undefined'

const importExternal = async (url: string): Promise<any> =>
  // Keep the URL out of the bundler: native never executes this branch.
  (new Function('url', 'return import(url)') as (url: string) => Promise<any>)(url)

async function renderPage(
  pdf: { getPage: (index: number) => Promise<any> },
  index: number,
  scale: number
): Promise<{ preview: string; width: number; height: number }> {
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

async function load(file: File): Promise<void> {
  if (!web) return
  setLoading(true)
  setError('')
  setStatus(`Loading ${file.name}…`)
  setFileName(file.name)
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

function choose(): void {
  if (!web) {
    setStatus('PDF editing requires the web build')
    return
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/pdf,.pdf'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) void load(file)
  })
  input.click()
}

function rotate(): void {
  const index = order()[selected()]
  if (index === undefined) return
  setPages((items) =>
    items.map((page) =>
      page.index === index ? { ...page, rotation: (page.rotation + 90) % 360 } : page
    )
  )
  setStatus('Page rotated 90°')
}

function remove(): void {
  if (order().length === 0) return
  const next = order().filter((_, position) => position !== selected())
  setOrder(next)
  setSelected(Math.max(0, Math.min(selected(), next.length - 1)))
  setStatus('Page removed from the export')
}

function move(direction: -1 | 1): void {
  const list = [...order()]
  const from = selected()
  const to = from + direction
  if (to < 0 || to >= list.length) return
  ;[list[from], list[to]] = [list[to]!, list[from]!]
  setOrder(list)
  setSelected(to)
  setStatus(direction < 0 ? 'Page moved earlier' : 'Page moved later')
}

async function exportPdf(): Promise<void> {
  const data = bytes()
  if (!data || order().length === 0 || !web) return
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
    setStatus('Export failed')
  } finally {
    setLoading(false)
  }
}

function currentPage(): PageInfo | undefined {
  return pages().find((page) => page.index === order()[selected()])
}

function PageList(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        width: 190,
        minWidth: 190,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { padding: 10, gap: 8 } },
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
        'PAGES'
      ),
      ...order().map((pageIndex, position) => {
        const page = pages().find((entry) => entry.index === pageIndex)
        if (!page) return null
        return jsx(
          'div',
          {
            key: String(pageIndex),
            role: 'button',
            tabIndex: 0,
            onClick: () => setSelected(position),
            style: () => ({
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              padding: 5,
              borderRadius: 2,
              backgroundColor: position === selected() ? ACCENT.tint : 'transparent',
              borderWidth: 1,
              borderColor: position === selected() ? ACCENT.main : 'transparent',
            }),
          },
          jsx('img', {
            src: page.preview,
            style: { width: 48, height: 62, borderWidth: 1, borderColor: office.border },
          }),
          jsx(
            'div',
            { style: { flexGrow: 1, gap: 2 } },
            jsx(
              'span',
              { style: { fontSize: 10.5, color: office.ink } },
              `Page ${pageIndex + 1}`
            ),
            jsx(
              'span',
              { style: { fontSize: 9, color: office.dim } },
              `${Math.round(page.width)} × ${Math.round(page.height)}`
            ),
            page.rotation
              ? jsx(
                  'span',
                  { style: { fontSize: 9, color: ACCENT.main } },
                  `${page.rotation}°`
                )
              : null
          )
        )
      }),
      order().length === 0
        ? jsx(
            'span',
            { style: { fontSize: 10, color: office.dim, paddingTop: 4 } },
            'No pages loaded'
          )
        : null
    )
  )
}

function Inspector(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        width: 228,
        minWidth: 228,
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
        { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
        'DOCUMENT'
      ),
      jsx('span', { style: { fontSize: 11, color: office.ink } }, fileName()),
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.dim } },
        dynamic(() => `${order().length} pages · ${Math.round(zoom() * 100)}% zoom`)
      ),
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted, marginTop: 6 } },
        'ANNOTATION'
      ),
      jsx(TextField, {
        value: () => note(),
        onChange: setNote,
        ariaLabel: 'Annotation text',
        width: 204,
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
        placeholder: 'Footer annotation',
      }),
      jsx(
        'span',
        {
          style: {
            fontSize: 9.5,
            color: office.muted,
            lineHeight: 14,
          },
        },
        'The note is drawn at the bottom-left of the selected page on export.'
      ),
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted, marginTop: 6 } },
        'PAGE'
      ),
      jsx(
        'span',
        { style: { fontSize: 11, color: office.ink } },
        dynamic(() => {
          const page = currentPage()
          return page
            ? `Page ${order()[selected()] + 1} · ${Math.round(page.width)} × ${Math.round(page.height)}`
            : 'No page selected'
        })
      ),
      error()
        ? jsx(
            'span',
            { style: { fontSize: 10, color: office.danger, lineHeight: 14 } },
            error()
          )
        : null
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'div',
      {
        style: {
          padding: 10,
          borderColor: office.borderSoft,
          borderWidth: 1,
          gap: 4,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.muted, lineHeight: 14 } },
        web
          ? 'PDF.js renders previews locally; pdf-lib rebuilds the page order on export.'
          : 'PDF.js and Blob downloads need the web build. The other 15 examples run on desktop and web.'
      )
    )
  )
}

function EmptyState(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        width: 430,
        padding: 26,
        gap: 10,
        alignItems: 'center',
        backgroundColor: office.surface,
        borderWidth: 1,
        borderColor: office.border,
      },
    },
    jsx(Icon, { name: 'page', size: 34, color: ACCENT.main }),
    jsx(
      'span',
      { style: { fontSize: 18, fontWeight: 600, color: office.ink } },
      web ? 'Open a PDF' : 'PDF editing is web-only'
    ),
    jsx(
      'span',
      {
        style: {
          fontSize: 11.5,
          color: office.muted,
          textAlign: 'center',
          lineHeight: 17,
        },
      },
      web
        ? 'Preview, reorder, rotate, annotate, and export. Files stay in the browser.'
        : 'PDF.js canvas rendering and Blob downloads are browser APIs. Run this example with --target web.'
    ),
    web
      ? jsx(
          'div',
          {
            role: 'button',
            tabIndex: 0,
            onClick: choose,
            style: {
              height: 30,
              paddingLeft: 16,
              paddingRight: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ACCENT.main,
              borderRadius: 2,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 11.5, color: '#ffffff', fontWeight: 600 } },
            'Choose PDF'
          )
        )
      : null
  )
}

function App(): ReturnType<typeof jsx> {
  const hasPages = (): boolean => order().length > 0
  return jsx(DesktopApp, {
    app: 'Tardis PDF',
    initial: 'P',
    file: () => fileName(),
    accent: ACCENT,
    toolbar: dynamic(() =>
      jsx(Toolbar, {
        accent: ACCENT,
        children: [
          jsx(ToolbarButton, {
            icon: 'page',
            label: 'Open',
            accent: ACCENT,
            onClick: choose,
            disabled: !web,
          }),
          jsx('div', {
            style: { width: 1, height: 20, backgroundColor: office.borderSoft, marginLeft: 4, marginRight: 4 },
          }),
          jsx(ToolbarButton, {
            icon: 'undo',
            label: 'Move left',
            accent: ACCENT,
            onClick: () => move(-1),
            disabled: !hasPages(),
          }),
          jsx(ToolbarButton, {
            icon: 'redo',
            label: 'Move right',
            accent: ACCENT,
            onClick: () => move(1),
            disabled: !hasPages(),
          }),
          jsx(ToolbarButton, {
            icon: 'grid',
            label: 'Rotate',
            accent: ACCENT,
            onClick: rotate,
            disabled: !hasPages(),
          }),
          jsx(ToolbarButton, {
            icon: 'close',
            label: 'Delete',
            accent: ACCENT,
            onClick: remove,
            disabled: !hasPages(),
          }),
          jsx('div', {
            style: { width: 1, height: 20, backgroundColor: office.borderSoft, marginLeft: 4, marginRight: 4 },
          }),
          jsx(ToolbarButton, {
            icon: 'minus',
            label: 'Zoom out',
            accent: ACCENT,
            onClick: () => setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(1)))),
            disabled: !hasPages(),
          }),
          jsx(ToolbarButton, {
            icon: 'plus',
            label: 'Zoom in',
            accent: ACCENT,
            onClick: () => setZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(1)))),
            disabled: !hasPages(),
          }),
          jsx('div', { style: { flexGrow: 1 } }),
          jsx(ToolbarButton, {
            icon: 'save',
            label: 'Export PDF',
            accent: ACCENT,
            onClick: () => void exportPdf(),
            disabled: !web || !hasPages(),
          }),
        ],
      })
    ),
    statusLeft: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => status())
    ),
    statusCenter: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() =>
        hasPages() ? `Page ${selected() + 1} of ${order().length}` : 'No document'
      )
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => `${order().length} pages`)
    ),
    zoom: () => zoom() * 100,
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        dynamic(() => (hasPages() ? jsx(PageList, {}) : null)),
        jsx(
          'div',
          {
            style: {
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#d9d9d9',
              minWidth: 0,
            },
          },
          dynamic(() => {
            if (loading()) {
              return jsx(
                'span',
                { style: { fontSize: 12, color: office.muted } },
                'Rendering pages…'
              )
            }
            const page = currentPage()
            if (!page) return jsx(EmptyState, {})
            return jsx('img', {
              src: page.preview,
              style: {
                width: Math.round(page.width * zoom()),
                height: Math.round(page.height * zoom()),
                borderWidth: 1,
                borderColor: office.border,
                backgroundColor: office.surface,
              },
            })
          })
        ),
        dynamic(() => jsx(Inspector, {}))
      ),
    ],
  })
}

render(() => jsx(App))
