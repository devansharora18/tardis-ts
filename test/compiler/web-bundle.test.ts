import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { JSDOM } from 'jsdom'
import { bundleApp } from '../../src/compiler/bundle'

const root = path.resolve(__dirname, '../..')
let dir = ''

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tardis-web-'))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('web bundle', () => {
  it('builds a shell and runs the same counter app in jsdom', async () => {
    const outfile = path.join(dir, 'app.js')
    const result = await bundleApp({
      entry: path.join(root, 'examples/native-counter/app.tsx'),
      outfile,
      target: 'web',
    })
    expect(result.shell).toBeDefined()
    expect(fs.existsSync(result.shell!)).toBe(true)

    const html = fs.readFileSync(result.shell!, 'utf8')
    expect(html).toContain('id="app"')
    expect(html).toContain('src="./app.js"')
    expect(html).toContain('<title>Tardis TS app</title>')

    const code = fs.readFileSync(outfile, 'utf8')
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      url: 'http://localhost/',
    })
    dom.window.eval(code)

    const app = dom.window.document.getElementById('app')!
    expect(app.textContent).toContain('Tardis')
    expect(app.textContent).toContain('Count: 0')

    const increment = Array.from(
      app.querySelectorAll<HTMLElement>('[data-tardis-ts]')
    ).find((element) => element.textContent === 'Increment' && element.children.length === 0)
    expect(increment).toBeDefined()
    increment!.dispatchEvent(
      new dom.window.MouseEvent('pointerdown', { bubbles: true })
    )
    increment!.dispatchEvent(
      new dom.window.MouseEvent('pointerup', { bubbles: true })
    )
    expect(app.textContent).toContain('Count: 1')
  }, 120_000)

  it('does not write a shell for the native target', async () => {
    const outfile = path.join(dir, 'native.js')
    const result = await bundleApp({
      entry: path.join(root, 'examples/native-counter/app.tsx'),
      outfile,
      target: 'native',
    })
    expect(result.shell).toBeUndefined()
    expect(fs.existsSync(path.join(dir, 'index.html'))).toBe(false)
  })
})

describe('web shell stylesheet', () => {
  it('links an explicit stylesheet', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tardis-css-'))
    try {
      const outfile = path.join(dir, 'app.js')
      const result = await bundleApp({
        entry: path.join(root, 'examples/native-counter/app.tsx'),
        outfile,
        target: 'web',
        css: path.join(dir, 'app.css'),
      })
      const html = fs.readFileSync(result.shell!, 'utf8')
      expect(html).toContain('<link rel="stylesheet" href="./app.css" />')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
