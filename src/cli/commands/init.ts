import fs from 'node:fs/promises'
import path from 'node:path'

const APP = `import { createSignal, render } from '@devansharora18/tardisjs/scene'

const [count, setCount] = createSignal(0)

function App() {
  return (
    <div style={{ padding: 32, gap: 12 }}>
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

const README = `# My Tardis app

\`\`\`sh
npm install
npx tardis dev
\`\`\`

- \`tardis dev\` rebuilds the bundle and restarts the native window on change.
- \`tardis build\` writes \`dist/app.js\`.
- \`tardis screenshot -o shot.png\` renders one frame headlessly.

The native runtime is built from the TardisJS repository:
\`cargo build --manifest-path native/Cargo.toml\`, or point
\`TARDIS_NATIVE_BIN\` at the binary.
`

export async function initProject(cwd = process.cwd()): Promise<void> {
  const entry = path.join(cwd, 'app.tsx')
  const exists = await fs.stat(entry).catch(() => null)
  if (exists) {
    throw new Error('app.tsx already exists in this directory')
  }
  const name =
    path
      .basename(cwd)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-') || 'tardis-app'

  await fs.writeFile(entry, APP, 'utf8')
  await fs.writeFile(
    path.join(cwd, 'package.json'),
    `${JSON.stringify(
      {
        name,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'tardis dev',
          build: 'tardis build',
          screenshot: 'tardis screenshot',
        },
        dependencies: {
          '@devansharora18/tardisjs': '^2.0.0-alpha.0',
        },
      },
      null,
      2
    )}\n`,
    'utf8'
  )
  await fs.writeFile(path.join(cwd, 'tsconfig.json'), TSCONFIG, 'utf8')
  await fs.writeFile(path.join(cwd, '.gitignore'), 'node_modules/\ndist/\n*.png\n', 'utf8')
  await fs.writeFile(path.join(cwd, 'README.md'), README, 'utf8')

  console.log('Created app.tsx, package.json, tsconfig.json, README.md')
  console.log('Next: npm install && npx tardis dev')
}
