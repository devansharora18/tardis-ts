import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { JSDOM } from 'jsdom'
import { bundleApp } from '../../src/compiler/bundle'

const root = path.resolve(__dirname, '../..')
const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

async function mount(entry: string): Promise<{ dom: JSDOM; app: HTMLElement }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tardis-app-'))
  dirs.push(dir)
  const outfile = path.join(dir, 'app.js')
  const result = await bundleApp({ entry: path.join(root, entry), outfile, target: 'web' })
  const html = fs.readFileSync(result.shell!, 'utf8')
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' })
  dom.window.eval(fs.readFileSync(outfile, 'utf8'))
  return { dom, app: dom.window.document.getElementById('app') as HTMLElement }
}

function leaf(dom: JSDOM, text: string): HTMLElement {
  const found = Array.from(
    dom.window.document.querySelectorAll<HTMLElement>('[data-tardis-ts]')
  ).find((element) => element.textContent === text && element.children.length === 0)
  if (!found) throw new Error(`no leaf ${text}`)
  return found
}

function click(dom: JSDOM, element: Element): void {
  element.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true }))
  element.dispatchEvent(new dom.window.MouseEvent('pointerup', { bubbles: true }))
}

describe('editor app', () => {
  it('mounts, switches tabs, and accepts typing in the editor', async () => {
    const { dom, app } = await mount('examples/editor/app.tsx')
    expect(app.textContent).toContain('Tardis Code')
    expect(app.textContent).toContain('WELCOME.md')
    expect(app.textContent).toContain('EXPLORER')

    click(dom, leaf(dom, 'main.ts'))
    expect(app.textContent).toContain('export function clamp')

    const field = app.querySelector<HTMLElement>('div[role="textbox"]')!
    click(dom, field)
    dom.window.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Z', bubbles: true })
    )
    expect(app.textContent).toContain('Zexport function clamp')
  }, 120_000)
})

describe('spreadsheet app', () => {
  it('mounts 100k rows and shows formula results', async () => {
    const { dom, app } = await mount('examples/spreadsheet/app.tsx')
    expect(app.textContent).toContain('Q4 Budget.xlsx')
    expect(app.textContent).toContain('Excel')
    expect(app.textContent).toContain('Widget Pro')
    expect(app.textContent).toContain('$24,196.50')

    click(dom, leaf(dom, '$5,940.00'))
    expect(app.textContent).toContain('=B2*C2')
  }, 120_000)
})
