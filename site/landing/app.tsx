import '@devansharora18/tardis-ts/web'
import { jsx, render } from '@devansharora18/tardis-ts/scene'

const APP_SNIPPET = `import '@devansharora18/tardis-ts/web'
import { createSignal, render } from '@devansharora18/tardis-ts/scene'

const [count, setCount] = createSignal(0)

function App() {
  return (
    <div style={{ padding: 32, gap: 12 }}>
      <h1>Same TSX. Two hosts.</h1>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(n => n + 1)}>
        Increment
      </button>
    </div>
  )
}

render(() => <App />)`

const COMMANDS = [
  ['npm install', 'Install the package and its platform runtime.'],
  ['npx tardis-ts create', 'Answer six prompts: platforms, styling, template, package manager, install, git.'],
  ['npx tardis-ts dev', 'Native window; add --target web for the browser.'],
]

const FEATURES: Array<[string, string, string]> = [
  ['01', 'Signals, not a virtual DOM', 'Components run once. Signals bind text, style, inputs, and layout to a retained scene tree.'],
  ['02', 'One patch stream, two hosts', 'The same scene ops drive taffy + cosmic-text + tiny-skia natively and a DOM adapter on web.'],
  ['03', 'Real inputs', 'Selection, multiline editing, IME preview/commit, Tab focus traversal, dialogs with focus traps.'],
  ['04', 'Forms and async data', 'createForm, async validation, submit errors, Select, RadioGroup, abortable resources and mutations.'],
  ['05', 'SSR and hydration', 'renderToString, renderDocument, and structural hydration that adopts server nodes.'],
  ['06', 'Accessibility', 'Semantic web output, ARIA attributes, and a native AccessKit tree with roles, values, focus, and actions.'],
  ['07', 'Native performance', 'wgpu presentation with softbuffer fallback, HiDPI, clipping, draggable scrollbars, ellipsis.'],
]

const EXAMPLES = [
  ['Tardis Code', 'VS Code-style editor', 'editor'],
  ['Tardis Sheet', '100,000 × 8 spreadsheet', 'spreadsheet'],
  ['Tardis Paint', 'PNG brush canvas', 'paint'],
  ['Tardis Docs', 'Markdown word processor', 'word'],
  ['Tardis Slides', 'Presentation mode', 'slides'],
  ['Tardis Board', 'Persistent kanban', 'kanban'],
  ['Tardis Calendar', 'Month view + events', 'calendar'],
  ['Tardis Weather', 'Live Open-Meteo API', 'weather'],
  ['Tardis Chat', 'OpenAI-compatible API', 'chat'],
  ['Tardis Contacts', 'CRUD + CSV export', 'contacts'],
  ['Tardis Images', 'Data-URL gallery', 'image-viewer'],
  ['Tardis Calculator', 'Expression parser', 'calculator'],
  ['Tardis PDF', 'PDF.js + pdf-lib · web only', 'pdf-editor'],
  ['Tardis Forms', 'Validation + submits', 'forms'],
  ['Tardis 10k', 'Virtualized list', 'virtual-10k'],
  ['Tardis Counter', 'Minimal starter', 'native-counter'],
]

function ascii(): string[] {
  const rows: string[] = []
  for (let y = 0; y < 18; y += 1) {
    let line = ''
    for (let x = 0; x < 88; x += 1) {
      const value =
        Math.sin(x * 0.18 + y * 0.31) +
        Math.cos(x * 0.07 - y * 0.21) +
        Math.sin((x + y) * 0.05)
      line += value > 1.15 ? '#' : value > 0.35 ? '+' : value > -0.2 ? '.' : ' '
    }
    rows.push(line)
  }
  return rows
}

function App(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    { className: 'landing' },
    jsx(
      'header',
      { className: 'nav' },
      jsx('div', { className: 'wordmark' }, 'tardis-ts'),
      jsx(
        'nav',
        { className: 'nav-links' },
        jsx('span', { className: 'nav-link', onClick: () => (location.href = './docs/index.html') }, 'Docs'),
        jsx('span', { className: 'nav-link', onClick: () => (location.href = '#examples') }, 'Examples'),
        jsx('span', { className: 'nav-link', onClick: () => (location.href = '#benchmarks') }, 'Benchmarks'),
        jsx('span', { className: 'nav-link', onClick: () => (location.href = 'https://github.com/devansharora18/tardis-ts') }, 'GitHub')
      ),
      jsx('span', { className: 'nav-status' }, 'v2.0 alpha')
    ),
    // Hero: asymmetric split with a real artifact.
    jsx(
      'section',
      { className: 'hero' },
      jsx(
        'div',
        { className: 'ascii-field' },
        ...ascii().map((line, index) =>
          jsx('span', { key: index, className: 'ascii-line' }, line)
        )
      ),
      jsx(
        'div',
        { className: 'hero-copy' },
        jsx('span', { className: 'eyebrow' }, 'TSX-native desktop + web'),
        jsx(
          'h1',
          { className: 'hero-title' },
          'One TSX file. Two hosts.'
        ),
        jsx(
          'p',
          { className: 'hero-body' },
          'Signals, a Rust renderer, and a DOM host. No virtual DOM.'
        ),
        jsx(
          'div',
          { className: 'hero-actions' },
          jsx(
            'span',
            {
              className: 'keycap keycap-primary',
              role: 'link',
              tabIndex: 0,
              onClick: () => (location.href = './docs/index.html'),
            },
            'Read the docs'
          ),
          jsx(
            'span',
            {
              className: 'keycap',
              role: 'link',
              tabIndex: 0,
              onClick: () => (location.href = 'https://github.com/devansharora18/tardis-ts'),
            },
            'Star on GitHub'
          )
        ),
        jsx(
          'div',
          { className: 'install-line' },
          jsx('span', { className: 'install-prompt' }, '$'),
          jsx('span', { className: 'install-code' }, ' npx @devansharora18/tardis-ts create')
        )
      ),
      jsx(
        'div',
        { className: 'artifact' },
        jsx(
          'div',
          { className: 'artifact-top' },
          jsx('span', {}, 'examples/native-counter/app.tsx'),
          jsx('span', { className: 'artifact-dot' }, '●')
        ),
        jsx('div', { className: 'artifact-code' }, APP_SNIPPET),
        jsx(
          'div',
          { className: 'artifact-foot' },
          jsx('span', {}, 'built 7.3 MB'),
          jsx('span', {}, 'first paint 451 ms'),
          jsx('span', {}, 'native + web')
        )
      )
    ),
    // Metrics band, one line each.
    jsx(
      'section',
      { className: 'metric-band' },
      jsx('div', { className: 'metric' }, jsx('span', { className: 'metric-value' }, '60.2 fps'), jsx('span', { className: 'metric-label' }, '100k-row sheet vs Dioxus 60.3')),
      jsx('div', { className: 'metric' }, jsx('span', { className: 'metric-value' }, '410 ms'), jsx('span', { className: 'metric-label' }, 'editor startup vs Zed 624 ms')),
      jsx('div', { className: 'metric' }, jsx('span', { className: 'metric-value' }, '45 MiB'), jsx('span', { className: 'metric-label' }, 'editor RSS vs Zed 363 MiB')),
      jsx('div', { className: 'metric' }, jsx('span', { className: 'metric-value' }, '16'), jsx('span', { className: 'metric-label' }, 'examples (15 both hosts)'))
    ),
    // Ledger of what ships.
    jsx(
      'section',
      { className: 'section ledger-section' },
      jsx('span', { className: 'section-label' }, 'What ships'),
      jsx(
        'div',
        { className: 'ledger' },
        ...FEATURES.map(([number, title, body]) =>
          jsx(
            'div',
            { key: number, className: 'ledger-row' },
            jsx('span', { className: 'ledger-number' }, number),
            jsx(
              'div',
              { className: 'ledger-copy' },
              jsx('span', { className: 'ledger-title' }, title),
              jsx('span', { className: 'ledger-body' }, body)
            ),
            jsx('span', { className: 'ledger-meta' }, 'shipped')
          )
        )
      )
    ),
    // Full-bleed band: one sentence.
    jsx(
      'section',
      { className: 'band' },
      jsx('span', {}, 'The renderer is Rust. The app surface is TypeScript.'),
      jsx('span', { className: 'band-sub' }, 'You only write TSX.')
    ),
    // Diptych: the same app, two hosts.
    jsx(
      'section',
      { className: 'section' },
      jsx('span', { className: 'section-label' }, 'One file, two runtimes'),
      jsx(
        'div',
        { className: 'diptych' },
        jsx(
          'div',
          { className: 'panel' },
          jsx('span', { className: 'panel-kicker' }, 'Native'),
          jsx('span', { className: 'panel-title' }, 'winit · taffy · cosmic-text · tiny-skia'),
          jsx('p', { className: 'panel-body' }, 'QuickJS evaluates the bundle and emits the same scene ops. AccessKit exposes focus and roles. wgpu presents the frame, softbuffer is the fallback.'),
          jsx('div', { className: 'mini-code' }, 'tardis-ts-native --bundle app.js\n--backend wgpu --scale 2')
        ),
        jsx(
          'div',
          { className: 'panel' },
          jsx('span', { className: 'panel-kicker' }, 'Web'),
          jsx('span', { className: 'panel-title' }, 'DOM adapter · hydration · SSR'),
          jsx('p', { className: 'panel-body' }, 'The DOM host applies the patch stream to real semantic elements. Server markup is adopted structurally, then patched in place.'),
          jsx('div', { className: 'mini-code' }, 'npx tardis-ts dev --target web\nnpx tardis-ts build --target web')
        )
      )
    ),
    // Examples horizontal band sequence.
    jsx(
      'section',
      { className: 'section', id: 'examples' },
      jsx('span', { className: 'section-label' }, '16 examples · 15 on both hosts'),
      jsx(
        'div',
        { className: 'example-grid' },
        ...EXAMPLES.map(([name, description, slug]) =>
          jsx(
            'div',
            {
              key: slug,
              className: 'example',
              role: 'link',
              tabIndex: 0,
              onClick: () => (location.href = `https://github.com/devansharora18/tardis-ts/tree/main/examples/${slug}`),
            },
            jsx('span', { className: 'example-name' }, name),
            jsx('span', { className: 'example-desc' }, description)
          )
        )
      )
    ),
    // Benchmarks table with caveats.
    jsx(
      'section',
      { className: 'section benchmarks', id: 'benchmarks' },
      jsx('span', { className: 'section-label' }, 'Measured, including the losses'),
      jsx(
        'div',
        { className: 'bench-table' },
        jsx(
          'div',
          { className: 'bench-row bench-head' },
          jsx('span', {}, 'Workload'),
          jsx('span', {}, 'Tardis TS'),
          jsx('span', {}, 'Baseline'),
          jsx('span', {}, 'Reading')
        ),
        jsx(
          'div',
          { className: 'bench-row' },
          jsx('span', {}, '10k mounted rows, browser update'),
          jsx('span', {}, '7.0 fps'),
          jsx('span', {}, 'Dioxus 10.7 fps'),
          jsx('span', {}, 'loss')
        ),
        jsx(
          'div',
          { className: 'bench-row' },
          jsx('span', {}, '100k virtualized sheet'),
          jsx('span', {}, '60.2 fps'),
          jsx('span', {}, 'Dioxus 60.3 fps'),
          jsx('span', {}, 'tie')
        ),
        jsx(
          'div',
          { className: 'bench-row' },
          jsx('span', {}, 'Editor startup'),
          jsx('span', {}, '410 ms'),
          jsx('span', {}, 'Zed 624 ms'),
          jsx('span', {}, 'win')
        ),
        jsx(
          'div',
          { className: 'bench-row' },
          jsx('span', {}, 'Desktop counter startup'),
          jsx('span', {}, '451 ms / 7.3 MB'),
          jsx('span', {}, 'Dioxus 625 ms / 8.7 MB'),
          jsx('span', {}, 'win')
        )
      ),
      jsx(
        'span',
        { className: 'bench-note' },
        'Same-machine Xvfb runs. The full-list browser loss is published in docs/BENCHMARKS.md, not hidden.'
      )
    ),
    // Colophon close.
    jsx(
      'footer',
      { className: 'colophon' },
      jsx(
        'div',
        { className: 'colophon-main' },
        jsx('span', { className: 'colophon-title' }, 'Start with one file.'),
        jsx('span', { className: 'install-line' }, jsx('span', { className: 'install-prompt' }, '$'), jsx('span', { className: 'install-code' }, ' npx @devansharora18/tardis-ts create'))
      ),
      jsx(
        'div',
        { className: 'colophon-links' },
        jsx('span', { className: 'nav-link', onClick: () => (location.href = './docs/index.html') }, 'Docs'),
        jsx('span', { className: 'nav-link', onClick: () => (location.href = 'https://github.com/devansharora18/tardis-ts') }, 'GitHub'),
        jsx('span', { className: 'nav-link', onClick: () => (location.href = './docs/index.html#packaging-native-binaries') }, 'Packaging'),
        jsx('span', { className: 'nav-link' }, 'MIT')
      )
    )
  )
}

render(() => jsx(App))
