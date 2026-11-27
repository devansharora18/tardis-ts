import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
  writeClipboard,
  type SceneEvent,
  type SceneNode,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  BigCommand,
  OfficeApp,
  Ribbon,
  RibbonGroup,
  SmallCommand,
  office,
  type Accent,
} from '../shared/office'

interface Slide {
  id: string
  title: string
  body: string
  notes: string
  layout: 'title' | 'content' | 'statement'
}

interface Theme {
  id: string
  name: string
  background: string
  panel: string
  text: string
  muted: string
  accent: string
}

const ACCENT: Accent = accents.powerpoint
const STORAGE_KEY = 'tardis-ts.slides.v2'

const THEMES: Theme[] = [
  {
    id: 'cobalt',
    name: 'Cobalt',
    background: '#0c1b33',
    panel: '#122a4d',
    text: '#f7f9fc',
    muted: '#a8bdd8',
    accent: '#58a6ff',
  },
  {
    id: 'ember',
    name: 'Ember',
    background: '#1d1310',
    panel: '#2c1c17',
    text: '#fff8f2',
    muted: '#d7b8a8',
    accent: '#ff8a4c',
  },
  {
    id: 'paper',
    name: 'Paper',
    background: '#f7f4ee',
    panel: '#ece6dc',
    text: '#23211e',
    muted: '#6f6a62',
    accent: '#c43e1c',
  },
  {
    id: 'forest',
    name: 'Forest',
    background: '#0e241e',
    panel: '#16362d',
    text: '#f2fbf7',
    muted: '#a7c7bb',
    accent: '#7ed957',
  },
]

const seed: Slide[] = [
  {
    id: 's1',
    title: 'Tardis TS',
    body: 'One TSX codebase.\nNative desktop and the web.',
    notes: 'Open with the outcome: one file, two hosts, no rewrite.',
    layout: 'title',
  },
  {
    id: 's2',
    title: 'One codebase',
    body:
      '• Components run once; signals bind the updates\n• Retained scene tree, not a virtual DOM\n• Rust renderer natively, DOM host on web',
    notes: 'Keep this slide on screen while demonstrating both builds.',
    layout: 'content',
  },
  {
    id: 's3',
    title: 'Measured, not promised',
    body:
      '60.2 fps on the 100k-row sheet\n8.3 fps on the 10k mounted stress case\n410 ms editor startup vs 624 ms',
    notes: 'Publish the loss to Dioxus on the 10k case. It is in the docs.',
    layout: 'content',
  },
  {
    id: 's4',
    title: 'Sixteen apps',
    body: 'Editor · Sheet · Paint · Docs · Slides · Board\nCalendar · Contacts · Calculator · Weather · Chat\nImages · PDF · Forms · Lists · Counter',
    notes: 'The examples are the test suite for the framework.',
    layout: 'content',
  },
  {
    id: 's5',
    title: 'Start with one file',
    body: 'npx @devansharora18/tardis-ts create\n\nRead the docs · github.com/devansharora18/tardis-ts',
    notes: 'Close on the scaffolder and the repository.',
    layout: 'statement',
  },
]

function loadSlides(): Slide[] {
  if (typeof localStorage === 'undefined') return seed
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return seed
    const parsed = JSON.parse(stored) as { slides?: Slide[]; theme?: string }
    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) return seed
    return parsed.slides
  } catch {
    return seed
  }
}

function loadTheme(): Theme {
  if (typeof localStorage === 'undefined') return THEMES[0]!
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return THEMES[0]!
    const parsed = JSON.parse(stored) as { theme?: string }
    return THEMES.find((entry) => entry.id === parsed.theme) ?? THEMES[0]!
  } catch {
    return THEMES[0]!
  }
}

const [slides, setSlides] = createSignal<Slide[]>(loadSlides())
const [index, setIndex] = createSignal(0)
const [theme, setTheme] = createSignal<Theme>(loadTheme())
const [tab, setTab] = createSignal('home')
const [presenting, setPresenting] = createSignal(false)
const [thumbsOpen, setThumbsOpen] = createSignal(true)
const [notesOpen, setNotesOpen] = createSignal(true)
const [status, setStatus] = createSignal('Saved locally')
const [viewportH, setViewportH] = createSignal(
  typeof window !== 'undefined' ? window.innerHeight : 800
)

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => setViewportH(window.innerHeight))
}

function active(): Slide {
  return slides()[Math.min(index(), slides().length - 1)]!
}

function persist(next: Slide[], message = 'Saved locally'): void {
  setSlides(next)
  try {
    localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({ slides: next, theme: theme().id })
    )
    setStatus(message)
  } catch {
    setStatus('Memory only')
  }
}

function update(patch: Partial<Slide>): void {
  persist(
    slides().map((slide) =>
      slide.id === active().id ? { ...slide, ...patch } : slide
    )
  )
}

function saveTheme(next: Theme): void {
  setTheme(next)
  try {
    localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({ slides: slides(), theme: next.id })
    )
    setStatus(`${next.name} theme applied`)
  } catch {
    setStatus('Memory only')
  }
}

function addSlide(layout: Slide['layout'] = 'content'): void {
  const slide: Slide = {
    id: `s-${Date.now()}`,
    title: layout === 'title' ? 'Untitled presentation' : 'New slide',
    body:
      layout === 'title'
        ? 'Subtitle or one-line promise'
        : '• First point\n• Second point\n• Third point',
    notes: '',
    layout,
  }
  persist([...slides(), slide], 'Slide added')
  setIndex(slides().length - 1)
}

function duplicate(): void {
  const source = active()
  const copy: Slide = {
    ...source,
    id: `s-${Date.now()}`,
    title: `${source.title} copy`,
  }
  const next = [...slides()]
  next.splice(index() + 1, 0, copy)
  persist(next, 'Slide duplicated')
  setIndex(index() + 1)
}

function remove(): void {
  if (slides().length === 1) {
    setStatus('A deck needs at least one slide')
    return
  }
  const next = slides().filter((slide) => slide.id !== active().id)
  persist(next, 'Slide deleted')
  setIndex(Math.min(index(), next.length - 1))
}

function move(direction: -1 | 1): void {
  const next = [...slides()]
  const to = index() + direction
  if (to < 0 || to >= next.length) return
  ;[next[index()], next[to]] = [next[to]!, next[index()]!]
  persist(next, direction < 0 ? 'Moved slide up' : 'Moved slide down')
  setIndex(to)
}

function exportOutline(): void {
  const text = slides()
    .map((slide, position) => `${position + 1}. ${slide.title}\n${slide.body}`)
    .join('\n\n')
  writeClipboard(text)
  setStatus('Outline copied')
}

function saveDeck(): void {
  try {
    localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({ slides: slides(), theme: theme().id })
    )
    setStatus('Deck saved to this device')
  } catch {
    setStatus('Save is unavailable')
  }
}

function newDeck(): void {
  const first = seed[0]!
  persist([{ ...first, id: `s-${Date.now()}` }], 'New deck created')
  setIndex(0)
  setTab('home')
}

function SlideCanvas(props: {
  slide: Slide
  width: number
  height: number
  big?: boolean
}): SceneNode {
  const t = (): Theme => theme()
  const padding = props.big ? 64 : 38
  return jsx(
    'div',
    {
      style: () => ({
        width: props.width,
        height: props.height,
        padding,
        gap: props.big ? 20 : 12,
        justifyContent: props.slide.layout === 'title' ? 'center' : 'flex-start',
        backgroundColor: t().background,
        borderWidth: 1,
        borderColor: props.big ? 'transparent' : '#c8c6c4',
      }),
    },
    jsx('div', {
      style: () => ({
        width: props.big ? 52 : 34,
        height: 3,
        backgroundColor: t().accent,
        marginBottom: props.big ? 6 : 3,
      }),
    }),
    jsx(
      'span',
      {
        style: () => ({
          fontFamily: 'sans-serif',
          fontSize: props.big
            ? 52
            : props.slide.layout === 'title'
              ? 36
              : 25,
          lineHeight: props.big ? 60 : 31,
          fontWeight: 700,
          color: t().text,
        }),
      },
      props.slide.title
    ),
    jsx(
      'div',
      {
        style: () => ({
          paddingTop: props.big ? 8 : 4,
          gap: props.big ? 8 : 4,
          flexGrow: 1,
        }),
      },
      ...props.slide.body.split('\n').map((line, lineIndex) =>
        jsx(
          'span',
          {
            key: lineIndex,
            style: () => ({
              fontFamily: 'sans-serif',
              fontSize: props.big ? 21 : props.slide.layout === 'title' ? 16 : 13,
              lineHeight: props.big ? 31 : 19,
              color: line.startsWith('•') ? t().text : t().muted,
            }),
          },
          line
        )
      )
    ),
    props.big
      ? null
      : jsx(
          'div',
          { style: { flexDirection: 'row', alignItems: 'center' } },
          jsx(
            'span',
            { style: () => ({ fontSize: 8.5, color: t().muted }) },
            'TARDIS LABS'
          ),
          jsx('div', { style: { flexGrow: 1 } }),
          jsx(
            'span',
            { style: () => ({ fontSize: 8.5, color: t().muted }) },
            String(slides().indexOf(props.slide) + 1)
          )
        )
  )
}

function Thumbnails(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        width: 198,
        minWidth: 198,
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
        'SLIDES'
      ),
      ...slides().map((slide, position) =>
        jsx(
          'div',
          {
            key: slide.id,
            role: 'button',
            tabIndex: 0,
            onClick: () => {
              setIndex(position)
              setStatus(`Slide ${position + 1} selected`)
            },
            style: () => ({
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              padding: 5,
              borderRadius: 2,
              backgroundColor: position === index() ? ACCENT.tint : 'transparent',
              borderWidth: 1,
              borderColor: position === index() ? ACCENT.main : 'transparent',
            }),
          },
          jsx(
            'span',
            { style: { fontSize: 9, color: office.dim, width: 12 } },
            String(position + 1)
          ),
          jsx(
            'div',
            {
              style: () => ({
                width: 132,
                height: 74,
                padding: 8,
                gap: 3,
                backgroundColor: theme().background,
                borderWidth: 1,
                borderColor: '#c8c6c4',
              }),
            },
            jsx(
              'span',
              {
                style: () => ({
                  fontSize: 8,
                  fontWeight: 700,
                  color: theme().text,
                  lineHeight: 10,
                }),
              },
              slide.title
            ),
            jsx(
              'span',
              {
                style: () => ({
                  fontSize: 6,
                  color: theme().muted,
                  lineHeight: 8,
                }),
              },
              slide.body.split('\n')[0] ?? ''
            )
          )
        )
      )
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'div',
      { style: { padding: 10 } },
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: () => addSlide(),
          style: {
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: office.border,
            backgroundColor: office.surface,
          },
        },
        jsx('span', { style: { fontSize: 11, color: ACCENT.main } }, '+ New slide')
      )
    )
  )
}

function Inspector(): SceneNode {
  return jsx(
    'div',
    {
      style: () => ({
        width: 252,
        minWidth: 252,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
        display: notesOpen() ? 'flex' : 'none',
      }),
    },
    jsx(
      'div',
      { style: { padding: 10, gap: 6 } },
      jsx(
        'span',
        { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
        'SLIDE'
      ),
      jsx(TextField, {
        value: () => slides()[index()]?.title ?? '',
        onChange: (title) => update({ title }),
        ariaLabel: 'Slide title',
        width: 228,
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
        placeholder: 'Slide title',
      }),
      jsx(TextField, {
        value: () => slides()[index()]?.body ?? '',
        onChange: (body) => update({ body }),
        ariaLabel: 'Slide body',
        multiline: true,
        rows: 6,
        width: 228,
        padding: 5,
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
        placeholder: 'One line per bullet',
      }),
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.muted, marginTop: 4 } },
        'SPEAKER NOTES'
      ),
      jsx(TextField, {
        value: () => slides()[index()]?.notes ?? '',
        onChange: (notes) => update({ notes }),
        ariaLabel: 'Speaker notes',
        multiline: true,
        rows: 4,
        width: 228,
        padding: 5,
        lineHeight: 15,
        fontSize: 10.5,
        backgroundColor: office.surface,
        color: office.ink,
        placeholderColor: office.dim,
        selectionColor: ACCENT.tint,
        caretColor: ACCENT.main,
        borderWidth: 1,
        borderColor: office.border,
        borderRadius: 2,
        placeholder: 'Notes for the presenter',
      }),
      jsx(
        'div',
        { style: { flexDirection: 'row', gap: 2, marginTop: 2 } },
        jsx(SmallCommand, {
          icon: 'copy',
          label: 'Duplicate',
          accent: ACCENT,
          onClick: duplicate,
        }),
        jsx(SmallCommand, {
          icon: 'close',
          label: 'Delete',
          accent: ACCENT,
          onClick: remove,
        })
      )
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
      dynamic(() => {
        const current = slides()[index()]
        return [
          jsx('span', { key: 'layout-label', style: { fontSize: 9.5, color: office.muted } }, 'LAYOUT'),
          jsx(
            'span',
            { key: 'layout', style: { fontSize: 11, color: office.ink } },
            current?.layout === 'title'
              ? 'Title slide'
              : current?.layout === 'statement'
                ? 'Statement'
                : 'Title and content'
          ),
          jsx('span', { key: 'theme-label', style: { fontSize: 9.5, color: office.muted, marginTop: 4 } }, 'THEME'),
          jsx('span', { key: 'theme', style: { fontSize: 11, color: office.ink } }, theme().name),
        ]
      })
    )
  )
}

function presentBar(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 11, color: office.muted, flexGrow: 1 } },
      'SLIDE SHOW'
    ),
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        onClick: () => setIndex((value) => Math.max(0, value - 1)),
        style: { paddingLeft: 12, paddingRight: 12, height: 26, alignItems: 'center', justifyContent: 'center' },
      },
      jsx('span', { style: { fontSize: 12, color: office.ink } }, 'Previous')
    ),
    jsx(
      'span',
      { style: { fontSize: 11, color: office.ink } },
      `${index() + 1} / ${slides().length}`
    ),
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        onClick: () =>
          setIndex((value) => Math.min(slides().length - 1, value + 1)),
        style: { paddingLeft: 12, paddingRight: 12, height: 26, alignItems: 'center', justifyContent: 'center' },
      },
      jsx('span', { style: { fontSize: 12, color: office.ink } }, 'Next')
    ),
    jsx(SmallCommand, {
      icon: 'close',
      label: 'Exit',
      accent: ACCENT,
      onClick: () => setPresenting(false),
    })
  )
}

function Presentation(): SceneNode {
  return jsx(
    'div',
    {
      tabIndex: 0,
      onKeyDown: (event: SceneEvent) => {
        if (event.key === 'Escape') setPresenting(false)
        if (event.key === 'ArrowRight' || event.key === ' ') {
          setIndex((value) => Math.min(slides().length - 1, value + 1))
        }
        if (event.key === 'ArrowLeft') {
          setIndex((value) => Math.max(0, value - 1))
        }
      },
      style: {
        flexGrow: 1,
        padding: 24,
        gap: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111111',
      },
    },
    jsx(
      'div',
      {
        style: {
          width: 1000,
          height: 562,
          borderWidth: 1,
          borderColor: '#2c2c2c',
        },
      },
      jsx(SlideCanvas, {
        slide: active(),
        width: 1000,
        height: 562,
        big: true,
      })
    ),
    presentBar()
  )
}

function homeRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Slides',
        children: [
          jsx(BigCommand, {
            icon: 'plus',
            label: 'New slide',
            accent: ACCENT,
            onClick: () => addSlide(),
          }),
          jsx(
            'div',
            { style: { flexDirection: 'column', gap: 1 } },
            jsx(SmallCommand, {
              icon: 'copy',
              label: 'Duplicate',
              accent: ACCENT,
              onClick: duplicate,
            }),
            jsx(SmallCommand, {
              icon: 'close',
              label: 'Delete',
              accent: ACCENT,
              onClick: remove,
            })
          ),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Arrange',
        children: [
          jsx(BigCommand, {
            icon: 'undo',
            label: 'Move up',
            accent: ACCENT,
            onClick: () => move(-1),
          }),
          jsx(BigCommand, {
            icon: 'redo',
            label: 'Move down',
            accent: ACCENT,
            onClick: () => move(1),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Text',
        children: [
          jsx(SmallCommand, {
            icon: 'font',
            label: 'Title layout',
            accent: ACCENT,
            active: active().layout === 'title',
            onClick: () => update({ layout: 'title' }),
          }),
          jsx(SmallCommand, {
            icon: 'list',
            label: 'Content layout',
            accent: ACCENT,
            active: active().layout === 'content',
            onClick: () => update({ layout: 'content' }),
          }),
          jsx(SmallCommand, {
            icon: 'page',
            label: 'Statement',
            accent: ACCENT,
            active: active().layout === 'statement',
            onClick: () => update({ layout: 'statement' }),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Slide show',
        children: [
          jsx(BigCommand, {
            icon: 'play',
            label: 'Present',
            accent: ACCENT,
            onClick: () => setPresenting(true),
          }),
          jsx(SmallCommand, {
            icon: 'list',
            label: 'Outline',
            accent: ACCENT,
            onClick: exportOutline,
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
        label: 'Deck',
        children: [
          jsx(BigCommand, { icon: 'page', label: 'New deck', accent: ACCENT, onClick: newDeck }),
          jsx(BigCommand, { icon: 'save', label: 'Save', accent: ACCENT, onClick: saveDeck }),
          jsx(BigCommand, {
            icon: 'copy',
            label: 'Export outline',
            accent: ACCENT,
            onClick: exportOutline,
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Present',
        children: [
          jsx(BigCommand, {
            icon: 'play',
            label: 'Present',
            accent: ACCENT,
            onClick: () => setPresenting(true),
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
        label: 'Slides',
        children: [
          jsx(BigCommand, { icon: 'plus', label: 'New slide', accent: ACCENT, onClick: () => addSlide() }),
          jsx(BigCommand, {
            icon: 'page',
            label: 'Title slide',
            accent: ACCENT,
            onClick: () => addSlide('title'),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Illustrations',
        children: [
          jsx(BigCommand, { icon: 'picture', label: 'Picture', accent: ACCENT, disabled: true }),
          jsx(BigCommand, { icon: 'chart', label: 'Chart', accent: ACCENT, disabled: true }),
        ],
      }),
    ],
  })
}

function designRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Themes',
        children: [
          ...THEMES.map((entry) =>
            jsx(
              'div',
              {
                key: entry.id,
                role: 'button',
                tabIndex: 0,
                'aria-label': entry.name,
                onClick: () => saveTheme(entry),
                style: {
                  width: 58,
                  height: 48,
                  padding: 4,
                  gap: 3,
                  backgroundColor: entry.background,
                  borderWidth: theme().id === entry.id ? 2 : 1,
                  borderColor: theme().id === entry.id ? ACCENT.main : office.border,
                },
              },
              jsx('div', {
                style: { height: 4, width: 20, backgroundColor: entry.accent },
              }),
              jsx(
                'span',
                { style: { fontSize: 8, color: entry.text, lineHeight: 9 } },
                entry.name
              )
            )
          ),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Layout',
        children: [
          jsx(SmallCommand, {
            icon: 'page',
            label: 'Title',
            accent: ACCENT,
            active: active().layout === 'title',
            onClick: () => update({ layout: 'title' }),
          }),
          jsx(SmallCommand, {
            icon: 'list',
            label: 'Content',
            accent: ACCENT,
            active: active().layout === 'content',
            onClick: () => update({ layout: 'content' }),
          }),
          jsx(SmallCommand, {
            icon: 'font',
            label: 'Statement',
            accent: ACCENT,
            active: active().layout === 'statement',
            onClick: () => update({ layout: 'statement' }),
          }),
        ],
      }),
    ],
  })
}

function showRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Start slide show',
        children: [
          jsx(BigCommand, {
            icon: 'play',
            label: 'From start',
            accent: ACCENT,
            onClick: () => {
              setIndex(0)
              setPresenting(true)
            },
          }),
          jsx(BigCommand, {
            icon: 'page',
            label: 'From current',
            accent: ACCENT,
            onClick: () => setPresenting(true),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Display',
        children: [
          jsx(SmallCommand, {
            icon: 'grid',
            label: 'Presenter notes',
            accent: ACCENT,
            active: notesOpen(),
            onClick: () => setNotesOpen((value) => !value),
          }),
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
        label: 'Panes',
        children: [
          jsx(BigCommand, {
            icon: 'list',
            label: 'Thumbnails',
            accent: ACCENT,
            active: thumbsOpen(),
            onClick: () => setThumbsOpen((value) => !value),
          }),
          jsx(BigCommand, {
            icon: 'comment',
            label: 'Inspector',
            accent: ACCENT,
            active: notesOpen(),
            onClick: () => setNotesOpen((value) => !value),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Present',
        children: [
          jsx(SmallCommand, {
            icon: 'play',
            label: 'Present',
            accent: ACCENT,
            onClick: () => setPresenting(true),
          }),
        ],
      }),
    ],
  })
}

function renderRibbon(name: string): SceneNode {
  if (name === 'file') return fileRibbon()
  if (name === 'insert') return insertRibbon()
  if (name === 'design') return designRibbon()
  if (name === 'slide show') return showRibbon()
  if (name === 'view') return viewRibbon()
  return homeRibbon()
}

function SlidesEditor(): ReturnType<typeof jsx> {
  const canvasHeight = (): number => Math.max(320, viewportH() - 200)
  const slideWidth = (): number =>
    Math.min(760, Math.max(560, (thumbsOpen() ? 800 : 1000) - 40))
  const slideHeight = (): number => Math.round(slideWidth() * 0.5625)
  return jsx(OfficeApp, {
    app: 'Tardis Slides',
    initial: 'S',
    file: 'Tardis TS deck.pptx',
    accent: ACCENT,
    tabs: ['File', 'Home', 'Insert', 'Design', 'Slide Show', 'View'],
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
      dynamic(() => `Slide ${index() + 1} of ${slides().length}`)
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => theme().name)
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        dynamic(() => (thumbsOpen() ? jsx(Thumbnails, {}) : null)),
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
          jsx(
            'div',
            {
              style: {
                height: 34,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingLeft: 14,
                paddingRight: 14,
                backgroundColor: office.chrome,
                borderColor: office.borderSoft,
                borderWidth: 1,
              },
            },
            jsx(
              'span',
              { style: { fontSize: 10.5, color: office.muted } },
              dynamic(() => `SLIDE ${index() + 1}`)
            ),
            jsx('div', { style: { flexGrow: 1 } }),
            jsx(
              'span',
              { style: { fontSize: 10.5, color: office.muted } },
              '16:9'
            ),
            jsx(SmallCommand, {
              icon: 'play',
              label: 'Present',
              accent: ACCENT,
              onClick: () => setPresenting(true),
            })
          ),
          jsx(
            'div',
            {
              style: {
                height: canvasHeight(),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#d9d9d9',
              },
            },
            dynamic(() =>
              jsx(SlideCanvas, {
                slide: active(),
                width: slideWidth(),
                height: slideHeight(),
              })
            )
          ),
          jsx(
            'div',
            {
              style: {
                height: 28,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingLeft: 14,
                paddingRight: 14,
                backgroundColor: office.chrome,
                borderColor: office.borderSoft,
                borderWidth: 1,
              },
            },
            jsx(
              'span',
              { style: { fontSize: 10, color: office.dim } },
              dynamic(() => `${slides().length} slides · ${theme().name} theme`)
            ),
            jsx('div', { style: { flexGrow: 1 } }),
            jsx(
              'span',
              { style: { fontSize: 10, color: office.dim } },
              dynamic(() => active().notes || 'No speaker notes')
            )
          )
        ),
        jsx(Inspector, {})
      ),
    ],
  })
}

function App(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    { style: { flexGrow: 1, flexDirection: 'column', minHeight: 0 } },
    dynamic(() =>
      presenting() ? jsx(Presentation, {}) : jsx(SlidesEditor, {})
    )
  )
}

render(() => jsx(App))
