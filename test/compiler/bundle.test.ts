import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { bundleApp, resolveRuntimeEntry } from '../../src/compiler/bundle'
import type { Patch } from '../../src/scene/index'

const dirs: string[] = []

beforeEach(() => {
  fs.rmSync(path.join(os.tmpdir(), 'tardis-bundle-test'), {
    recursive: true,
    force: true,
  })
})

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

function tempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tardis-bundle-'))
  dirs.push(dir)
  return dir
}

describe('bundleApp', () => {
  it('finds the in-repo scene runtime', () => {
    expect(resolveRuntimeEntry()).toMatch(/src[\\/]scene[\\/]index\.ts$/)
  })

  it('bundles tsx into a self-contained iife', async () => {
    const dir = tempProject()
    const entry = path.join(dir, 'app.tsx')
    fs.writeFileSync(
      entry,
      `import { createSignal, render } from '@devansharora18/tardisjs/scene'
       const [count, setCount] = createSignal(2)
       function App() {
         return <div><h1>Count: {count()}</h1><button onClick={() => setCount(count() + 1)}>+1</button></div>
       }
       render(() => <App />)
      `,
      'utf8'
    )
    const outfile = path.join(dir, 'app.js')
    const result = await bundleApp({ entry, outfile })
    expect(result.bytes).toBeGreaterThan(500)
    const code = fs.readFileSync(outfile, 'utf8')
    expect(code).not.toContain("from '@devansharora18/tardisjs/scene'")
    expect(code).not.toContain('<h1>')
    expect(code).toContain('__tardis_flush')

    const patches: Patch[] = []
    ;(globalThis as unknown as Record<string, unknown>)['__tardis_flush'] = (
      json: string
    ): void => {
      patches.push(JSON.parse(json) as Patch)
    }
    await import(/* @vite-ignore */ `${pathToFileURL(outfile).href}?t=${Date.now()}`)
    const ops = patches.flatMap((patch) => patch.ops)
    expect(ops.some((op) => op.op === 'text' && op.value === 'Count: 2')).toBe(true)
    expect(ops.some((op) => op.op === 'create' && op.kind === 'view')).toBe(true)
  })

  it('fails with a diagnostic for broken tsx', async () => {
    const dir = tempProject()
    const entry = path.join(dir, 'bad.tsx')
    fs.writeFileSync(entry, `export const App = () => <div>`, 'utf8')
    await expect(bundleApp({ entry, outfile: path.join(dir, 'bad.js') })).rejects.toThrow(
      /error/i
    )
  })

  it('fails for a missing entry', async () => {
    await expect(
      bundleApp({ entry: '/nope/missing.tsx', outfile: '/tmp/missing.js' })
    ).rejects.toThrow(/entry not found/)
  })
})
