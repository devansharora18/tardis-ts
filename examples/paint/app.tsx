import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  writeClipboard,
  type SceneEvent,
} from '@devansharora18/tardis-ts/scene'
import { createSurface, line, stamp, type Point } from './engine'
import { encodePng } from './png'
import { Button, Page } from '../shared/ui'
import { colors, mono } from '../shared/theme'

const WIDTH = 760
const HEIGHT = 500
const COLORS = ['#e6edf3', '#f85149', '#3fb950', '#58a6ff', '#d29922', '#bc8cff', '#39c5cf']

let surface = createSurface(WIDTH, HEIGHT)
const [image, setImage] = createSignal(encodePng(WIDTH, HEIGHT, surface))
const [color, setColor] = createSignal('#e6edf3')
const [size, setSize] = createSignal(4)
const [eraser, setEraser] = createSignal(false)
const [drawing, setDrawing] = createSignal(false)
const [status, setStatus] = createSignal('Ready')
const undoStack: Uint8Array[] = []
let last: Point | null = null

const refresh = (): void => {
  setImage(encodePng(WIDTH, HEIGHT, surface))
}

const snapshot = (): void => {
  undoStack.push(surface.slice())
  if (undoStack.length > 20) undoStack.shift()
}

const point = (event: SceneEvent): Point => ({
  x: Math.min(WIDTH, Math.max(0, event.localX ?? event.x ?? 0)),
  y: Math.min(HEIGHT, Math.max(0, event.localY ?? event.y ?? 0)),
})

const onDown = (event: SceneEvent): void => {
  snapshot()
  const at = point(event)
  last = at
  setDrawing(true)
  stamp(
    surface,
    WIDTH,
    HEIGHT,
    at,
    size() / 2,
    eraser() ? '#ffffff' : color()
  )
  refresh()
  setStatus('Drawing')
}

const onMove = (event: SceneEvent): void => {
  if (!drawing()) return
  const at = point(event)
  if (last) {
    line(
      surface,
      WIDTH,
      HEIGHT,
      last,
      at,
      size() / 2,
      eraser() ? '#ffffff' : color()
    )
  } else {
    stamp(surface, WIDTH, HEIGHT, at, size() / 2, eraser() ? '#ffffff' : color())
  }
  last = at
  refresh()
}

const onUp = (): void => {
  if (!drawing()) return
  setDrawing(false)
  last = null
  setStatus('Stroke saved')
}

const undo = (): void => {
  const previous = undoStack.pop()
  if (!previous) {
    setStatus('Nothing to undo')
    return
  }
  surface = previous
  refresh()
  setStatus('Undone')
}

const clear = (): void => {
  snapshot()
  surface = createSurface(WIDTH, HEIGHT)
  refresh()
  setStatus('Canvas cleared')
}

const save = async (): Promise<void> => {
  let downloaded = false
  if (typeof document !== 'undefined') {
    const anchor = document.createElement('a')
    anchor.href = image()
    anchor.download = 'tardis-paint.png'
    anchor.click()
    downloaded = true
  }
  await writeClipboard(image())
  setStatus(downloaded ? 'Downloaded PNG' : 'PNG copied to clipboard')
}

function App(): ReturnType<typeof jsx> {
  return jsx(
    Page,
    {
      title: 'Tardis Paint',
      subtitle: `${WIDTH} × ${HEIGHT} · PNG export`,
      actions: [
        jsx(Button, { label: 'Undo', onClick: undo }),
        jsx(Button, { label: 'Clear', onClick: clear, danger: true }),
        jsx(Button, { label: 'Export PNG', onClick: () => void save(), primary: true }),
      ],
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' } },
      jsx(
        'div',
        {
          style: {
            width: 180,
            padding: 12,
            gap: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.panel,
          },
        },
        jsx('span', { style: { fontSize: 11, color: colors.muted } }, 'BRUSH'),
        jsx(
          'div',
          { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 } },
          ...COLORS.map((swatch) =>
            jsx('div', {
              key: swatch,
              role: 'button',
              tabIndex: 0,
              'aria-label': `Color ${swatch}`,
              onClick: () => {
                setColor(swatch)
                setEraser(false)
              },
              style: () => ({
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: swatch,
                borderWidth: color() === swatch && !eraser() ? 3 : 1,
                borderColor:
                  color() === swatch && !eraser() ? colors.text : colors.border,
              }),
            })
          )
        ),
        jsx('span', { style: { fontSize: 11, color: colors.muted, marginTop: 4 } }, 'SIZE'),
        jsx(
          'div',
          { style: { flexDirection: 'row', gap: 6 } },
          ...[2, 4, 8, 14, 22].map((value) =>
            jsx(
              'div',
              {
                key: String(value),
                role: 'button',
                tabIndex: 0,
                onClick: () => setSize(value),
                style: () => ({
                  width: 30,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: size() === value ? colors.accent : colors.border,
                  backgroundColor:
                    size() === value ? '#1f6feb33' : colors.panel2,
                  color: colors.text,
                  fontSize: 11,
                }),
              },
              String(value)
            )
          )
        ),
        jsx(Button, {
          label: eraser() ? 'Eraser: on' : 'Eraser: off',
          onClick: () => setEraser((value) => !value),
          primary: eraser(),
        }),
        jsx('div', { style: { height: 1, backgroundColor: colors.border } }),
        jsx(
          'span',
          { style: { color: colors.dim, fontSize: 11, lineHeight: 18 } },
          'Click and drag to paint. Native and web use the same pointer stream.'
        )
      ),
      jsx(
        'div',
        {
          onPointerDown: onDown,
          onPointerMove: onMove,
          onPointerUp: onUp,
          style: {
            width: WIDTH,
            height: HEIGHT,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          },
        },
        jsx('img', {
          src: () => image(),
          style: { width: WIDTH, height: HEIGHT },
          alt: 'Paint canvas',
        })
      )
    ),
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 16, color: colors.muted, fontSize: 12 } },
      jsx('span', { style: { color: colors.text } }, dynamic(() => status())),
      jsx('span', {}, `${COLORS.length} colors`),
      jsx('span', {}, dynamic(() => `brush ${size()} px`)),
      jsx('span', { style: { flexGrow: 1 } }),
      jsx('span', { style: { fontFamily: mono } }, 'PNG · data URL')
    )
  )
}

render(() => jsx(App))
