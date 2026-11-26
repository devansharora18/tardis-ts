import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { createPrompter, isInteractive, type Prompter } from '../lib/prompt'

export type Platform = 'native' | 'web' | 'both'
export type Styling = 'default' | 'tailwind'
export type Template = 'counter' | 'form' | 'sheet'
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export interface ScaffoldOptions {
  name?: string
  platform?: Platform
  styling?: Styling
  template?: Template
  packageManager?: PackageManager
  install?: boolean
  git?: boolean
  force?: boolean
  prompt?: boolean
}

export interface ResolvedScaffold {
  name: string
  platform: Platform
  styling: Styling
  template: Template
  packageManager: PackageManager
  install: boolean
  git: boolean
}

export interface ScaffoldResult {
  dir: string
  options: ResolvedScaffold
  files: string[]
}

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["**/*.tsx", "**/*.ts"]
}
`

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app.tsx'],
  theme: {
    extend: {
      colors: { canvas: '#0a0a0a', panel: '#111111', line: '#222222' },
    },
  },
  plugins: [],
}
`

const POSTCSS_CONFIG = `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
`

const TAILWIND_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #app { height: 100%; margin: 0; }
body {
  background: #0a0a0a;
  color: #ededed;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
`

function counterApp(tailwind: boolean): string {
  const className = tailwind ? ' className="min-h-screen p-8 text-white"' : ''
  return `import '@devansharora18/tardis-ts/web'
import { createSignal, render } from '@devansharora18/tardis-ts/scene'

const [count, setCount] = createSignal(0)

function App() {
  return (
    <div${className} style={{ padding: 32, gap: 12 }}>
      <h1>Hello, Tardis</h1>
      <p>Count: {count()}</p>
      <button style={{ width: 180 }} onClick={() => setCount((n) => n + 1)}>
        Increment
      </button>
    </div>
  )
}

render(() => <App />)
`
}

function formApp(tailwind: boolean): string {
  const className = tailwind ? ' className="min-h-screen p-8 text-white"' : ''
  return `import '@devansharora18/tardis-ts/web'
import {
  Checkbox,
  createForm,
  createSignal,
  FormField,
  render,
  TextField,
} from '@devansharora18/tardis-ts/scene'

function App() {
  const [subscribed, setSubscribed] = createSignal(false)
  const form = createForm({
    initial: { name: '', email: '' },
    validate: (values) => {
      const errors: Record<string, string> = {}
      if (!values.name.trim()) errors.name = 'Name is required'
      if (!values.email.includes('@')) errors.email = 'Enter a valid email'
      return errors
    },
    onSubmit: async (values) => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      console.log('submitted', values, { subscribed: subscribed() })
    },
  })

  return (
    <div${className} style={{ padding: 32, gap: 16, width: 420 }}>
      <h1>Sign up</h1>
      <FormField label="Name" error={form.field('name').error}>
        <TextField
          value={form.field('name').value}
          onChange={form.field('name').onChange}
          onBlur={form.field('name').onBlur}
          placeholder="Ada Lovelace"
        />
      </FormField>
      <FormField label="Email" error={form.field('email').error}>
        <TextField
          value={form.field('email').value}
          onChange={form.field('email').onChange}
          onBlur={form.field('email').onBlur}
          placeholder="ada@example.com"
        />
      </FormField>
      <Checkbox
        checked={() => subscribed()}
        onChange={setSubscribed}
        label="Send product updates"
      />
      <button style={{ width: 160 }} onClick={() => void form.submit()}>
        {form.submitting() ? 'Submitting…' : 'Create account'}
      </button>
      {form.submitted() ? <p>Welcome aboard.</p> : null}
      {form.submitError() ? (
        <p style={{ color: '#ff7b72' }}>{form.submitError()?.message}</p>
      ) : null}
    </div>
  )
}

render(() => <App />)
`
}

function sheetApp(tailwind: boolean): string {
  const className = tailwind ? ' className="min-h-screen p-6 text-white"' : ''
  return `import '@devansharora18/tardis-ts/web'
import { render, VirtualList } from '@devansharora18/tardis-ts/scene'

const ROWS = 100_000
const HEIGHT = 32
const rows = Array.from({ length: ROWS }, (_, index) => index + 1)
const columns = ['A', 'B', 'C', 'D', 'E', 'F']

function App() {
  return (
    <div${className} style={{ padding: 24, gap: 12 }}>
      <h1>100,000 rows</h1>
      <div style={{ flexDirection: 'row', gap: 1 }}>
        <span style={{ width: 56, color: '#8b949e' }}>#</span>
        {columns.map((column) => (
          <span key={column} style={{ width: 110, color: '#8b949e' }}>
            {column}
          </span>
        ))}
      </div>
      <VirtualList
        items={() => rows}
        rowHeight={HEIGHT}
        height={620}
        overscan={8}
        renderRow={(row) => (
          <div
            style={{
              height: HEIGHT,
              flexDirection: 'row',
              gap: 1,
              backgroundColor: row % 2 === 0 ? '#111111' : '#0e0e0e',
            }}
          >
            <span style={{ width: 56, color: '#666666' }}>{row}</span>
            {columns.map((column) => (
              <span
                key={column}
                style={{ width: 110, color: '#ededed' }}
              >{column + row}</span>
            ))}
          </div>
        )}
      />
      <p style={{ color: '#666666' }}>
        Wheel to scroll. Virtualized: only visible rows mount.
      </p>
    </div>
  )
}

render(() => <App />)
`
}

function appFor(template: Template, tailwind: boolean): string {
  if (template === 'form') return formApp(tailwind)
  if (template === 'sheet') return sheetApp(tailwind)
  return counterApp(tailwind)
}

function readme(name: string, options: ResolvedScaffold): string {
  const web = options.platform === 'web' || options.platform === 'both'
  const native = options.platform === 'native' || options.platform === 'both'
  const sections: string[] = [
    `# ${name}`,
    '',
    'Generated by `tardis-ts create`.',
    '',
    `- Platforms: **${options.platform}**`,
    `- Styling: **${options.styling}**`,
    `- Template: **${options.template}**`,
    '',
  ]
  if (web) {
    sections.push(
      '## Web',
      '',
      '```sh',
      'npm run dev:web',
      '```',
      '',
      'Build: `npm run build:web`. Preview: `npm run preview`.',
      ''
    )
  }
  if (native) {
    sections.push(
      '## Native',
      '',
      '```sh',
      'npm run dev',
      '```',
      '',
      'If no platform package is installed, build the runtime once:',
      '',
      '```sh',
      'cargo build --release --manifest-path node_modules/@devansharora18/tardis-ts/native/Cargo.toml',
      '```',
      '',
      'Screenshot: `npm run screenshot`.',
      ''
    )
  }
  if (options.styling === 'tailwind') {
    sections.push(
      '## Tailwind',
      '',
      'Tailwind classes apply on the **web** target. Native uses the inline style',
      'objects, so keep those as the cross-platform baseline. Build scripts write',
      '`dist/web/app.css` and link it from the generated shell. If you add classes',
      'while the dev server is running, re-run `npm run css`.',
      ''
    )
  }
  return sections.join('\n')
}

function detectPackageManager(cwd: string): PackageManager {
  const checks: Array<[string, PackageManager]> = [
    ['bun.lockb', 'bun'],
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
  ]
  for (const [file, manager] of checks) {
    if (fsSync.existsSync(path.join(cwd, file))) return manager
  }
  return 'npm'
}

async function askOptions(
  cwd: string,
  options: ScaffoldOptions,
  prompter: Prompter
): Promise<ResolvedScaffold> {
  const platform =
    options.platform ??
    (await prompter.select<Platform>(
      'Which platforms?',
      [
        { label: 'Native + Web', value: 'both', hint: '(one TSX app)' },
        { label: 'Web only', value: 'web' },
        { label: 'Native only', value: 'native' },
      ],
      'both'
    ))

  let styling =
    options.styling ??
    (await prompter.select<Styling>(
      'Styling',
      [
        { label: 'Tardis style objects', value: 'default' },
        {
          label: 'Tailwind CSS',
          value: 'tailwind',
          hint: platform === 'native' ? '(web only)' : '(web target)',
        },
      ],
      'default'
    ))
  if (styling === 'tailwind' && platform === 'native') {
    console.log('  Tailwind needs the web target; using Tardis styles.')
    styling = 'default'
  }

  const template =
    options.template ??
    (await prompter.select<Template>(
      'Template',
      [
        { label: 'Counter', value: 'counter' },
        { label: 'Form + validation', value: 'form' },
        { label: '100k-row sheet', value: 'sheet' },
      ],
      'counter'
    ))

  const detected = detectPackageManager(cwd)
  const packageManager =
    options.packageManager ??
    (await prompter.select<PackageManager>(
      'Package manager',
      [
        { label: 'npm', value: 'npm' },
        { label: 'pnpm', value: 'pnpm' },
        { label: 'yarn', value: 'yarn' },
        { label: 'bun', value: 'bun' },
      ],
      detected
    ))

  const install =
    options.install ?? (await prompter.confirm('Install dependencies?', true))
  const git =
    options.git ?? (await prompter.confirm('Initialize a git repository?', true))

  return {
    name: options.name ?? 'tardis-app',
    platform,
    styling,
    template,
    packageManager,
    install,
    git,
  }
}

function packageJson(name: string, options: ResolvedScaffold): string {
  const web = options.platform === 'web' || options.platform === 'both'
  const native = options.platform === 'native' || options.platform === 'both'
  const scripts: Record<string, string> = {}
  if (native) {
    scripts['dev'] = 'tardis-ts dev'
    scripts['build'] = 'tardis-ts build'
    scripts['screenshot'] = 'tardis-ts screenshot'
  }
  if (web) {
    const css = options.styling === 'tailwind'
    scripts['dev:web'] = css
      ? 'npm run css && tardis-ts dev --target web --css dist/web/app.css'
      : 'tardis-ts dev --target web'
    scripts['build:web'] = css
      ? 'npm run css && tardis-ts build --target web --css dist/web/app.css'
      : 'tardis-ts build --target web'
    scripts['preview'] = 'tardis-ts preview'
    if (css) {
      scripts['css'] =
        'tailwindcss -i ./src/styles.css -o ./dist/web/app.css --minify'
    }
  }
  if (!native && web) {
    scripts['dev'] = scripts['dev:web']!
    scripts['build'] = scripts['build:web']!
  }

  const devDependencies: Record<string, string> = {}
  if (options.styling === 'tailwind') {
    devDependencies['tailwindcss'] = '^3.4.0'
    devDependencies['postcss'] = '^8.4.0'
    devDependencies['autoprefixer'] = '^10.4.0'
  }

  return `${JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts,
      dependencies: {
        '@devansharora18/tardis-ts': '^2.0.0-alpha.0',
      },
      ...(Object.keys(devDependencies).length > 0 ? { devDependencies } : {}),
    },
    null,
    2
  )}\n`
}

async function writeProject(
  dir: string,
  options: ResolvedScaffold,
  force: boolean
): Promise<string[]> {
  const existing = await fs.readdir(dir).catch(() => [] as string[])
  if (existing.length > 0 && !force) {
    throw new Error(`Directory is not empty: ${dir}`)
  }
  await fs.mkdir(dir, { recursive: true })
  const files: string[] = []
  const write = async (relative: string, content: string): Promise<void> => {
    const target = path.join(dir, relative)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, content, 'utf8')
    files.push(relative)
  }

  const tailwind = options.styling === 'tailwind'
  await write('app.tsx', appFor(options.template, tailwind))
  await write('package.json', packageJson(options.name, options))
  await write('tsconfig.json', TSCONFIG)
  await write('.gitignore', 'node_modules\ndist\n*.png\n')
  await write('README.md', readme(options.name, options))
  if (tailwind) {
    await write('tailwind.config.js', TAILWIND_CONFIG)
    await write('postcss.config.js', POSTCSS_CONFIG)
    await write('src/styles.css', TAILWIND_CSS)
  }
  return files
}

export async function createProject(
  dir: string,
  options: ScaffoldOptions = {}
): Promise<ScaffoldResult> {
  const target = path.resolve(dir)
  const interactive = options.prompt !== false && isInteractive()
  const inferred =
    path
      .basename(target)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tardis-app'
  const name = options.name ?? inferred

  let resolved: ResolvedScaffold
  if (interactive) {
    const prompter = createPrompter()
    try {
      resolved = await askOptions(target, { ...options, name }, prompter)
    } finally {
      prompter.close()
    }
  } else {
    resolved = {
      name,
      platform: options.platform ?? 'both',
      styling: options.styling ?? 'default',
      template: options.template ?? 'counter',
      packageManager: options.packageManager ?? detectPackageManager(target),
      install: options.install ?? false,
      git: options.git ?? false,
    }
    if (resolved.styling === 'tailwind' && resolved.platform === 'native') {
      resolved.styling = 'default'
    }
  }

  const files = await writeProject(target, resolved, options.force ?? false)

  if (resolved.git) {
    spawnSync('git', ['init', '-q'], { cwd: target, stdio: 'ignore' })
  }
  if (resolved.install) {
    const command =
      resolved.packageManager === 'yarn'
        ? ['yarn']
        : resolved.packageManager === 'bun'
          ? ['bun', 'install']
          : [resolved.packageManager, 'install']
    const result = spawnSync(command[0]!, command.slice(1), {
      cwd: target,
      stdio: 'inherit',
    })
    if (result.error) {
      console.warn(`tardis-ts: install failed: ${result.error.message}`)
    }
  }

  return { dir: target, options: resolved, files }
}

export async function initProject(
  cwd = process.cwd(),
  options: ScaffoldOptions = {}
): Promise<ScaffoldResult> {
  return createProject(cwd, options)
}
