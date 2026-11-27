import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
} from '@devansharora18/tardis-ts/scene'
import { Badge, Button, Card, Page } from '../shared/ui'
import { colors } from '../shared/theme'
import { createSurface, stamp } from '../paint/engine'
import { encodePng } from '../paint/png'

interface Picture {
  id: string
  name: string
  src: string
}

function makeArt(seed: number): string {
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
  return encodePng(width, height, pixels)
}

const sample: Picture[] = [
  { id: 'one', name: 'orbits.png', src: makeArt(1) },
  { id: 'two', name: 'signal.png', src: makeArt(2) },
  { id: 'three', name: 'field.png', src: makeArt(3) },
]

const [pictures, setPictures] = createSignal<Picture[]>(sample)
const [index, setIndex] = createSignal(0)
const [fit, setFit] = createSignal<'contain' | 'fill'>('contain')
const [status, setStatus] = createSignal('Generated samples')

const active = (): Picture => pictures()[index()]!

const openFile = (): void => {
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
      setPictures((items) => [
        ...items,
        { id: `${file.name}-${Date.now()}`, name: file.name, src: String(reader.result) },
      ])
      setIndex(pictures().length - 1)
      setStatus(`Opened ${file.name}`)
    })
    reader.readAsDataURL(file)
  })
  input.click()
}

function App(): ReturnType<typeof jsx> {
  return jsx(
    Page,
    {
      title: 'Tardis Images',
      subtitle: 'PNG data-URL gallery · native and web',
      actions: [
        jsx(Button, { label: 'Open image', onClick: openFile }),
        jsx(Button, {
          label: 'Fit: contain',
          onClick: () => setFit((value) => (value === 'contain' ? 'fill' : 'contain')),
        }),
        jsx(Button, {
          label: 'Next',
          onClick: () => setIndex((value) => (value + 1) % pictures().length),
          primary: true,
        }),
      ],
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 14, flexGrow: 1, minHeight: 0 } },
      jsx(
        Card,
        {
          title: 'LIBRARY',
          children: [
            ...pictures().map((picture, pictureIndex) =>
              jsx(
                'div',
                {
                  key: picture.id,
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => {
                    setIndex(pictureIndex)
                    setStatus(picture.name)
                  },
                  style: () => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    padding: 6,
                    borderRadius: 6,
                    backgroundColor:
                      pictureIndex === index() ? '#1f2937' : 'transparent',
                  }),
                },
                jsx('img', {
                  src: picture.src,
                  style: { width: 44, height: 30, borderRadius: 3 },
                }),
                jsx('span', { style: { color: colors.text, fontSize: 11 } }, picture.name)
              )
            ),
          ],
        }
      ),
      jsx(
        'div',
        {
          style: {
            flexGrow: 1,
            gap: 8,
            padding: 12,
            borderRadius: 10,
            backgroundColor: '#05080d',
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
          },
        },
        jsx('img', {
          src: () => active().src,
          fit: () => fit(),
          style: {
            width: 720,
            height: 480,
            borderRadius: 6,
          },
        })
      ),
      jsx(
        Card,
        {
          title: 'DETAILS',
          children: [
            jsx('span', { style: { fontFamily: 'monospace', color: colors.text } }, dynamic(() => active().name)),
            jsx(Badge, { label: 'PNG' }),
            jsx('span', { style: { color: colors.muted, fontSize: 11 } }, '480 × 320 source'),
            jsx(
              'span',
              { style: { color: colors.dim, fontSize: 11, lineHeight: 16 } },
              'Data-URL images decode in the native renderer and render as <img> on web.'
            ),
            jsx('span', { style: { color: colors.muted, fontSize: 11 } }, dynamic(() => status()))
          ],
        }
      )
    )
  )
}

render(() => jsx(App))
