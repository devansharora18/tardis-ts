import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
} from '@devansharora18/tardis-ts/scene'
import { Button, Card, Page } from '../shared/ui'
import type { SceneEvent } from '@devansharora18/tardis-ts/scene'
import { colors } from '../shared/theme'

interface Slide {
  id: string
  title: string
  body: string
}

const KEY = 'tardis-ts.slides'
const seed: Slide[] = [
  { id: 's1', title: 'Tardis TS', body: 'One TSX app.\nNative and web.' },
  { id: 's2', title: 'Why?', body: 'Signals + a retained scene tree.\nNo virtual DOM.' },
  { id: 's3', title: 'This deck', body: 'Built with the framework it presents.' },
]

function load(): Slide[] {
  try {
    const stored = localStorage?.getItem(KEY)
    return stored ? (JSON.parse(stored) as Slide[]) : seed
  } catch {
    return seed
  }
}

const [slides, setSlides] = createSignal<Slide[]>(load())
const [index, setIndex] = createSignal(0)
const [presenting, setPresenting] = createSignal(false)
const [status, setStatus] = createSignal('Saved locally')

const active = (): Slide => slides()[Math.min(index(), slides().length - 1)]!

const store = (next: Slide[]): void => {
  setSlides(next)
  try {
    localStorage?.setItem(KEY, JSON.stringify(next))
    setStatus('Saved locally')
  } catch {
    setStatus('Memory only')
  }
}

const update = (patch: Partial<Slide>): void => {
  store(slides().map((slide) => (slide.id === active().id ? { ...slide, ...patch } : slide)))
}

const add = (): void => {
  const slide = { id: `s-${Date.now()}`, title: 'New slide', body: 'Start writing…' }
  store([...slides(), slide])
  setIndex(slides().length - 1)
}

const remove = (id: string): void => {
  if (slides().length === 1) return
  const next = slides().filter((slide) => slide.id !== id)
  store(next)
  setIndex(Math.min(index(), next.length - 1))
}

function SlideCanvas(props: { slide: Slide; big?: boolean }): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        aspectRatio: props.big ? undefined : 1.6,
        minHeight: props.big ? 0 : 320,
        height: props.big ? 560 : undefined,
        width: props.big ? 900 : undefined,
        padding: props.big ? 56 : 22,
        gap: props.big ? 22 : 10,
        justifyContent: 'center',
        borderRadius: props.big ? 12 : 6,
        backgroundColor: '#0b1220',
        borderWidth: 1,
        borderColor: '#1f6feb55',
      },
    },
    jsx(
      'span',
      {
        style: {
          fontSize: props.big ? 46 : 20,
          fontWeight: 700,
          color: colors.text,
          lineHeight: props.big ? 56 : 26,
        },
      },
      props.slide.title
    ),
    jsx('div', { style: { height: 2, width: 64, backgroundColor: colors.accent } }),
    ...props.slide.body.split('\n').map((line, i) =>
      jsx(
        'span',
        {
          key: i,
          style: {
            fontSize: props.big ? 24 : 12,
            color: '#c9d1d9',
            lineHeight: props.big ? 34 : 18,
          },
        },
        line
      )
    )
  )
}

function App(): ReturnType<typeof jsx> {
  if (presenting()) {
    return jsx(
      'div',
      {
        tabIndex: 0,
        onKeyDown: (event: SceneEvent) => {
          if (event.key === 'Escape') setPresenting(false)
          if (event.key === 'ArrowRight' || event.key === ' ') {
            setIndex((value) => Math.min(slides().length - 1, value + 1))
          }
          if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1))
        },
        style: {
          flexGrow: 1,
          padding: 28,
          gap: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#05080d',
        },
      },
      jsx(SlideCanvas, { slide: active(), big: true }),
      jsx(
        'div',
        { style: { flexDirection: 'row', gap: 14, color: colors.muted, fontSize: 12 } },
        jsx(Button, { label: '←', onClick: () => setIndex((v) => Math.max(0, v - 1)) }),
        jsx('span', {}, `${index() + 1} / ${slides().length}`),
        jsx(Button, {
          label: '→',
          onClick: () => setIndex((v) => Math.min(slides().length - 1, v + 1)),
          primary: true,
        }),
        jsx(Button, { label: 'Exit', onClick: () => setPresenting(false) })
      )
    )
  }

  return jsx(
    Page,
    {
      title: 'Tardis Slides',
      subtitle: 'Presentation editor · keyboard presentation mode',
      actions: [
        jsx(Button, { label: 'New slide', onClick: add }),
        jsx(Button, {
          label: 'Present',
          onClick: () => setPresenting(true),
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
          title: 'SLIDES',
          children: [
            ...slides().map((slide, i) =>
              jsx(
                'div',
                {
                  key: slide.id,
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => setIndex(i),
                  style: () => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    borderRadius: 6,
                    backgroundColor: i === index() ? '#1f2937' : 'transparent',
                  }),
                },
                jsx('span', { style: { color: colors.dim, fontSize: 10 } }, String(i + 1)),
                jsx(
                  'span',
                  { style: { flexGrow: 1, color: i === index() ? colors.text : colors.muted } },
                  slide.title
                ),
                jsx(
                  'span',
                  {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `Delete ${slide.title}`,
                    onClick: () => remove(slide.id),
                    style: { color: colors.dim, padding: 2 },
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
        { style: { flexGrow: 1, gap: 10, minWidth: 0 } },
        jsx(TextField, {
          value: () => active().title,
          onChange: (title) => update({ title }),
          ariaLabel: 'Slide title',
          width: 420,
          placeholder: 'Slide title',
        }),
        jsx(TextField, {
          value: () => active().body,
          onChange: (body) => update({ body }),
          ariaLabel: 'Slide body',
          multiline: true,
          rows: 6,
          wrap: false,
          width: 420,
          placeholder: 'One line per bullet',
        }),
        jsx('div', { style: { color: colors.muted, fontSize: 11 } }, dynamic(() => status()))
      ),
      jsx(Card, {
        title: 'PREVIEW',
        grow: true,
        children: [dynamic(() => jsx(SlideCanvas, { slide: active() }))],
      })
    )
  )
}

render(() => jsx(App))
