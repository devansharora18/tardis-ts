import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  writeClipboard,
} from '@devansharora18/tardis-ts/scene'
import { createSurface, stamp } from '../paint/engine'
import { encodePng } from '../paint/png'
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

interface Picture {
  id: string
  name: string
  src: string
  width: number
  height: number
}

const ACCENT: Accent = accents.outlook

function makeArt(seed: number): Picture {
  const width = 480
  const height = 320
  const pixels = createSurface(width, height, '#0b1220')
  const palette = ['#58a6ff', '#3fb950', '#d29922', '#bc8cff', '#39c5cf']
  for (let index = 0; index < 220; index += 1) {
    const x = (Math.sin(seed + index * 0.7) * 0.5 + 0.5) * width
    const y = (Math.cos(seed * 1.3 + index * 0.9) * 0.5 + 0.5) * height
    stamp(
      pixels,
      width,
      height,
      { x, y },
      4 + ((index * seed) % 22),
      palette[index % palette.length]!
    )
  }
  return {
    id: `sample-${seed}`,
    name: ['orbits.png', 'signal.png', 'field.png'][seed - 1] ?? 'image.png',
    src: encodePng(width, height, pixels),
    width,
    height,
  }
}

const [pictures, setPictures] = createSignal<Picture[]>([
  makeArt(1),
  makeArt(2),
  makeArt(3),
])
const [index, setIndex] = createSignal(0)
const [zoom, setZoom] = createSignal(1)
const [fit, setFit] = createSignal<'contain' | 'fill'>('contain')
const [status, setStatus] = createSignal('Generated samples')

function active(): Picture | undefined {
  return pictures()[Math.min(index(), pictures().length - 1)]
}

function openFile(): void {
  if (typeof document === 'undefined') {
    setStatus('Open is available on the web build')
    return
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/webp'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const src = String(reader.result)
      const image = new Image()
      image.addEventListener('load', () => {
        setPictures((items) => [
          ...items,
          {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            src,
            width: image.naturalWidth,
            height: image.naturalHeight,
          },
        ])
        setIndex(pictures().length - 1)
        setStatus(`Opened ${file.name}`)
      })
      image.src = src
    })
    reader.readAsDataURL(file)
  })
  input.click()
}

function remove(): void {
  if (pictures().length === 1) {
    setStatus('Keep at least one image')
    return
  }
  const next = pictures().filter((_, position) => position !== index())
  setPictures(next)
  setIndex(Math.min(index(), next.length - 1))
  setStatus('Image removed from the library')
}

function save(): void {
  const picture = active()
  if (!picture) return
  let downloaded = false
  if (typeof document !== 'undefined') {
    const anchor = document.createElement('a')
    anchor.href = picture.src
    anchor.download = picture.name
    anchor.click()
    downloaded = true
  }
  writeClipboard(picture.src)
  setStatus(downloaded ? 'Image downloaded' : 'Image copied to clipboard')
}

function Library(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 208,
        minWidth: 208,
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
        'LIBRARY'
      ),
      ...pictures().map((picture, position) =>
        jsx(
          'div',
          {
            key: picture.id,
            role: 'button',
            tabIndex: 0,
            onClick: () => {
              setIndex(position)
              setStatus(picture.name)
            },
            style: {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              padding: 5,
              borderRadius: 2,
              backgroundColor: position === index() ? ACCENT.tint : 'transparent',
              borderWidth: 1,
              borderColor: position === index() ? ACCENT.main : 'transparent',
            },
          },
          jsx('img', {
            src: picture.src,
            style: { width: 56, height: 38, borderWidth: 1, borderColor: office.border },
          }),
          jsx(
            'div',
            { style: { flexGrow: 1, gap: 1 } },
            jsx(
              'span',
              { style: { fontSize: 10, color: office.ink, whiteSpace: 'nowrap' } },
              picture.name
            ),
            jsx(
              'span',
              { style: { fontSize: 8.5, color: office.dim } },
              `${picture.width} × ${picture.height}`
            )
          )
        )
      )
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'div',
      { style: { padding: 10, gap: 4 } },
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: openFile,
          style: {
            height: 27,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: office.border,
            backgroundColor: office.surface,
          },
        },
        jsx('span', { style: { fontSize: 10.5, color: ACCENT.main } }, 'Open image')
      ),
      jsx(
        'span',
        { style: { fontSize: 9, color: office.dim, lineHeight: 13 } },
        'Samples are generated locally as PNG data URLs.'
      )
    )
  )
}

function Viewer(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2b2b2b',
        minWidth: 0,
        padding: 18,
      },
    },
    dynamic(() => {
      const picture = active()
      if (!picture) {
        return jsx(
          'span',
          { style: { fontSize: 13, color: '#c8c8c8' } },
          'No image selected'
        )
      }
      return jsx('img', {
        src: picture.src,
        fit: () => fit(),
        style: {
          width: Math.round(picture.width * zoom()),
          height: Math.round(picture.height * zoom()),
          borderWidth: 1,
          borderColor: '#4a4a4a',
        },
      })
    })
  )
}

function Details(): ReturnType<typeof jsx> {
  const picture = active()
  return jsx(
    'div',
    {
      style: {
        width: 236,
        minWidth: 236,
        padding: 10,
        gap: 5,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
      'DETAILS'
    ),
    jsx(
      'span',
      { style: { fontSize: 12, color: office.ink, fontWeight: 500 } },
      picture?.name ?? 'No image'
    ),
    ...(picture
      ? [
          ['Dimensions', `${picture.width} × ${picture.height}`],
          ['Fit', fit() === 'contain' ? 'Contain' : 'Fill'],
          ['Zoom', `${Math.round(zoom() * 100)}%`],
          [
            'Data size',
            `${Math.round((picture.src.length * 3) / 4 / 1024)} KB`,
          ],
          ['Format', 'PNG data URL'],
        ]
      : []
    ).map(([label, value]) =>
      jsx(
        'div',
        {
          key: label,
          style: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: office.borderSoft,
            paddingTop: 3,
            paddingBottom: 3,
          },
        },
        jsx('span', { style: { fontSize: 10, color: office.muted } }, label!),
        jsx('span', { style: { fontSize: 10.5, color: office.ink } }, value!)
      )
    ),
    jsx(
      'span',
      { style: { fontSize: 9.5, color: office.dim, lineHeight: 14, marginTop: 4 } },
      'Data URLs decode in the native renderer and render as <img> on web.'
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        onClick: remove,
        style: {
          height: 26,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: office.danger,
        },
      },
      jsx('span', { style: { fontSize: 10, color: office.danger } }, 'Remove image')
    )
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Photos',
    initial: 'P',
    file: () => active()?.name ?? 'No image',
    accent: ACCENT,
    toolbar: dynamic(() =>
      jsx(Toolbar, {
        accent: ACCENT,
        children: [
          jsx(ToolbarButton, {
            icon: 'plus',
            label: 'Open',
            accent: ACCENT,
            onClick: openFile,
          }),
          jsx(ToolbarButton, {
            icon: 'undo',
            label: 'Previous',
            accent: ACCENT,
            onClick: () =>
              setIndex((value) => (value - 1 + pictures().length) % pictures().length),
            disabled: pictures().length < 2,
          }),
          jsx(ToolbarButton, {
            icon: 'redo',
            label: 'Next',
            accent: ACCENT,
            onClick: () => setIndex((value) => (value + 1) % pictures().length),
            disabled: pictures().length < 2,
          }),
          jsx('div', {
            style: { width: 1, height: 20, backgroundColor: office.borderSoft, marginLeft: 4, marginRight: 4 },
          }),
          jsx(ToolbarButton, {
            icon: 'grid',
            label: fit() === 'contain' ? 'Fit' : 'Fill',
            accent: ACCENT,
            onClick: () =>
              setFit((value) => (value === 'contain' ? 'fill' : 'contain')),
          }),
          jsx(ToolbarButton, {
            icon: 'minus',
            label: 'Zoom out',
            accent: ACCENT,
            onClick: () => setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(1)))),
          }),
          jsx(ToolbarButton, {
            icon: 'plus',
            label: 'Zoom in',
            accent: ACCENT,
            onClick: () => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(1)))),
          }),
          jsx('div', { style: { flexGrow: 1 } }),
          jsx(ToolbarButton, {
            icon: 'save',
            label: 'Save image',
            accent: ACCENT,
            onClick: save,
            disabled: !active(),
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
        active() ? `${index() + 1} of ${pictures().length} · ${Math.round(zoom() * 100)}%` : 'No image'
      )
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => (fit() === 'contain' ? 'Contain' : 'Fill'))
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        dynamic(() => jsx(Library, {})),
        dynamic(() => jsx(Viewer, {})),
        dynamic(() => jsx(Details, {}))
      ),
    ],
  })
}

render(() => jsx(App))
