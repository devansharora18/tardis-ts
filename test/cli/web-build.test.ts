import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildApp } from '../../src/cli/commands/build'

const root = path.resolve(__dirname, '../..')
const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

function temp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tardis-cli-build-'))
  dirs.push(dir)
  return dir
}

describe('cli build', () => {
  it('builds the web target with a shell', async () => {
    const dir = temp()
    const out = path.join(dir, 'app.js')
    const result = await buildApp(root, {
      entry: 'examples/native-counter/app.tsx',
      target: 'web',
      out,
    })
    expect(result.target).toBe('web')
    expect(result.outfile).toBe(out)
    expect(result.shell).toBe(path.join(dir, 'index.html'))
    expect(fs.existsSync(result.shell!)).toBe(true)
    expect(fs.statSync(out).size).toBeGreaterThan(1000)
    const html = fs.readFileSync(result.shell!, 'utf8')
    expect(html).toContain('id="app"')
    expect(html).toContain('src="./app.js"')
  }, 120_000)

  it('builds the native target without a shell', async () => {
    const dir = temp()
    const out = path.join(dir, 'app.js')
    const result = await buildApp(root, {
      entry: 'examples/native-counter/app.tsx',
      target: 'native',
      out,
    })
    expect(result.target).toBe('native')
    expect(result.shell).toBeUndefined()
    expect(fs.existsSync(path.join(dir, 'index.html'))).toBe(false)
  }, 120_000)
})
