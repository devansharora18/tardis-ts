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
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

const WIDTH = 760
const HEIGHT = 500
const ACCENT: Accent = accents.paint
const COLORS = [
  '#201f1e',
  '#f85149',
  '#107c41',
  '#185abd',
  '#d29922',
  '#7030a0',
  '#0f7b8a',
  '#8a8886',
  '#ffffff',
]

let surface = createSurface(WIDTH, HEIGHT)
const [image, setImage] = createSignal(encodePng(WIDTH, HEIGHT, surface))
const [color, setColor] = createSignal('#201f1e')
const [size, setSize] = createSignal(4)
const [tool, setTool] = createSignal<'brush' | 'eraser'>('brush')
const [drawing, setDrawing] = createSignal(false)
const [status, setStatus] = createSignal('Ready')
const undoStack: Uint8Array[] = []
const redoStack: Uint8Array[] = []
let last: Point | null = null

function refresh(): void {
  setImage(encodePng(WIDTH, HEIGHT, surface))
}

function snapshot(): void {
  undoStack.push(surface.slice())
  if (undoStack.length > 20) undoStack.shift()
  redoStack.length = 0
}

function point(event: SceneEvent): Point {
  return {
    x: Math.min(WIDTH, Math.max(0, event.localX ?? event.x ?? 0)),
    y: Math.min(HEIGHT, Math.max(0, event.localY ?? event.y ?? 0)),
  }
}

function paintColor(): string {
  return tool() === 'eraser' ? '#ffffff' : color()
}

function onDown(event: SceneEvent): void {
  snapshot()
  const at = point(event)
  last = at
  setDrawing(true)
  stamp(surface, WIDTH, HEIGHT, at, size() / 2, paintColor())
  refresh()
  setStatus(tool() === 'eraser' ? 'Erasing' : 'Drawing')
}

function onMove(event: SceneEvent): void {
  if (!drawing()) return
  const at = point(event)
  if (last) {
    line(surface, WIDTH, HEIGHT, last, at, size() / 2, paintColor())
  } else {
    stamp(surface, WIDTH, HEIGHT, at, size() / 2, paintColor())
  }
  last = at
  refresh()
}

function onUp(): void {
  if (!drawing()) return
  setDrawing(false)
  last = null
  setStatus('Stroke saved')
}

function undo(): void {
  const previous = undoStack.pop()
  if (!previous) {
    setStatus('Nothing to undo')
    return
  }
  redoStack.push(surface.slice())
  surface = previous
  refresh()
  setStatus('Undone')
}

function redo(): void {
  const next = redoStack.pop()
  if (!next) {
    setStatus('Nothing to redo')
    return
  }
  undoStack.push(surface.slice())
  surface = next
  refresh()
  setStatus('Redone')
}

function clear(): void {
  snapshot()
  surface = createSurface(WIDTH, HEIGHT)
  refresh()
  setStatus('Canvas cleared')
}

function save(): void {
  let downloaded = false
  if (typeof document !== 'undefined') {
    const anchor = document.createElement('a')
    anchor.href = image()
    anchor.download = 'tardis-paint.png'
    anchor.click()
    downloaded = true
  }
  writeClipboard(image())
  setStatus(downloaded ? 'PNG downloaded' : 'PNG copied to clipboard')
}

function ColorSwatch(props: { value: string }): ReturnType<typeof jsx> {
  return jsx('div', {
    role: 'button',
    tabIndex: 0,
    'aria-label': `Color ${props.value}`,
    onClick: () => {
      setColor(props.value)
      setTool('brush')
    },
    style: () => ({
      width: 22,
      height: 22,
      borderRadius: 3,
      backgroundColor: props.value,
      borderWidth: color() === props.value && tool() === 'brush' ? 3 : 1,
      borderColor:
        color() === props.value && tool() === 'brush'
          ? ACCENT.main
          : office.border,
    }),
  })
}

function SizeButton(props: { value: number }): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      role: 'button',
      tabIndex: 0,
      onClick: () => setSize(props.value),
      style: () => ({
        width: 30,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: size() === props.value ? ACCENT.main : office.border,
        backgroundColor: size() === props.value ? ACCENT.tint : office.surface,
        borderRadius: 2,
      }),
    },
    jsx(
      'span',
      { style: { fontSize: 10, color: office.ink } },
      String(props.value)
    )
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Paint',
    initial: 'P',
    file: 'Untitled.png',
    accent: ACCENT,
    toolbar: dynamic(() => jsx(Toolbar, {
      accent: ACCENT,
      children: [
        jsx(ToolbarButton, {
          icon: 'brush',
          label: 'Brush',
          accent: ACCENT,
          active: tool() === 'brush',
          onClick: () => setTool('brush'),
        }),
        jsx(ToolbarButton, {
          icon: 'minus',
          label: 'Eraser',
          accent: ACCENT,
          active: tool() === 'eraser',
          onClick: () => setTool('eraser'),
        }),
        jsx('div', {
          style: { width: 1, height: 20, backgroundColor: office.borderSoft, marginLeft: 4, marginRight: 4 },
        }),
        jsx(ToolbarButton, {
          icon: 'undo',
          label: 'Undo',
          accent: ACCENT,
          onClick: undo,
        }),
        jsx(ToolbarButton, {
          icon: 'redo',
          label: 'Redo',
          accent: ACCENT,
          onClick: redo,
        }),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(ToolbarButton, {
          icon: 'close',
          label: 'Clear',
          accent: ACCENT,
          onClick: clear,
        }),
        jsx(ToolbarButton, {
          icon: 'save',
          label: 'Save PNG',
          accent: ACCENT,
          onClick: save,
        }),
      ],
    })),
    statusLeft: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => status())
    ),
    statusCenter: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      `${WIDTH} × ${HEIGHT}`
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => `${tool() === 'eraser' ? 'Eraser' : 'Brush'} · ${size()} px`)
    ),
    children: [
      jsx(
        'div',
        {
          style: {
            height: 34,
            minHeight: 34,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingLeft: 10,
            paddingRight: 10,
            backgroundColor: office.chrome,
            borderColor: office.borderSoft,
            borderWidth: 1,
          },
        },
        jsx(
          'span',
          { style: { fontSize: 9.5, color: office.muted, marginRight: 4 } },
          'COLOR'
        ),
        ...COLORS.map((value) => jsx(ColorSwatch, { key: value, value })),
        jsx('div', {
          style: () => ({
            width: 22,
            height: 22,
            borderRadius: 3,
            backgroundColor: paintColor(),
            borderWidth: 1,
            borderColor: office.border,
            marginLeft: 6,
          }),
        })
      ),
      jsx(
        'div',
        {
          style: {
            flexGrow: 1,
            flexDirection: 'row',
            minHeight: 0,
            backgroundColor: '#d9d9d9',
          },
        },
        jsx(
          'div',
          {
            style: {
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 18,
            },
          },
          jsx(
            'div',
            {
              style: {
                width: WIDTH,
                height: HEIGHT,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#8a8886',
              },
            },
            jsx('img', {
              src: () => image(),
              onPointerDown: onDown,
              onPointerMove: onMove,
              onPointerUp: onUp,
              draggable: false,
              style: { width: WIDTH, height: HEIGHT },
              alt: 'Paint canvas',
            })
          )
        ),
        jsx(
          'div',
          {
            style: {
              width: 208,
              minWidth: 208,
              padding: 10,
              gap: 8,
              backgroundColor: office.chrome,
              borderColor: office.borderSoft,
              borderWidth: 1,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
            'BRUSH SIZE'
          ),
          jsx(
            'div',
            { style: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' } },
            ...[2, 4, 8, 14, 22].map((value) =>
              jsx(SizeButton, { key: value, value })
            )
          ),
          jsx(
            'span',
            { style: { fontSize: 10, fontWeight: 600, color: office.muted, marginTop: 4 } },
            'TOOL'
          ),
          jsx(
            'span',
            { style: { fontSize: 11, color: office.ink } },
            dynamic(() => (tool() === 'eraser' ? 'Eraser' : 'Round brush'))
          ),
          jsx(
            'span',
            { style: { fontSize: 10, fontWeight: 600, color: office.muted, marginTop: 4 } },
            'CANVAS'
          ),
          jsx(
            'span',
            { style: { fontSize: 11, color: office.ink } },
            `${WIDTH} × ${HEIGHT} · RGBA`
          ),
          jsx(
            'span',
            { style: { fontSize: 11, color: office.ink } },
            dynamic(() => `${undoStack.length} undo · ${redoStack.length} redo`)
          ),
          jsx('div', { style: { flexGrow: 1 } }),
          jsx(
            'span',
            {
              style: {
                fontSize: 9.5,
                color: office.muted,
                lineHeight: 15,
              },
            },
            'Drag on the canvas to paint. Export writes the current pixels as a PNG data URL.'
          )
        )
      ),
    ],
  })
}

render(() => jsx(App))
