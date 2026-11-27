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
    expect(app.textContent).toContain('Tardis Sheet')
    expect(app.textContent).toContain('Widget Pro')
    expect(app.textContent).toContain('$24,196.50')

    click(dom, leaf(dom, '$5,940.00'))
    expect(app.textContent).toContain('=B2*C2')
  }, 120_000)
})


describe('word app', () => {
  it('mounts the page and opens the markdown source', async () => {
    const { dom, app } = await mount('examples/word/app.tsx')
    expect(app.textContent).toContain('Q4 Business Review.md')
    expect(app.textContent).toContain('Executive summary')
    expect(app.textContent).toContain('Revenue closed at')

    click(dom, leaf(dom, 'Edit source'))
    expect(app.textContent).toContain('MARKDOWN SOURCE')
    expect(app.textContent).toContain('# Q4 Business Review')
  }, 120_000)
})


describe('office interactions', () => {
  it('enters presentation mode from the slides ribbon', async () => {
    const { dom, app } = await mount('examples/slides/app.tsx')
    click(dom, leaf(dom, 'Present'))
    expect(app.textContent).toContain('SLIDE SHOW')
    expect(app.textContent).toContain('Exit')
  }, 120_000)

  it('toggles the terms checkbox in the form', async () => {
    const { dom, app } = await mount('examples/forms/app.tsx')
    const boxes = app.querySelectorAll<HTMLElement>('[role="checkbox"]')
    expect(boxes.length).toBe(2)
    click(dom, boxes[1]!)
    const after = app.querySelectorAll<HTMLElement>('[role="checkbox"]')
    expect(after[1]!.getAttribute('aria-checked')).toBe('true')
  }, 120_000)
})

describe('office and utility examples', () => {
  const cases: Array<[string, string[]]> = [
    ['slides', ['Tardis Slides', 'Tardis TS deck.pptx', 'SLIDES']],
    ['paint', ['Tardis Paint', 'Untitled.png', 'Save PNG']],
    ['pdf-editor', ['Tardis PDF', 'Open a PDF', 'Tardis PDF']],
    ['calendar', ['Tardis Calendar', 'MY CALENDARS', 'Month']],
    ['contacts', ['Tardis Contacts', 'Ada Lovelace', 'People']],
    ['kanban', ['Tardis Board', 'Q4 launch', 'Backlog']],
    ['chat', ['Tardis Chat', 'CONNECTION', 'Local model']],
    ['calculator', ['Tardis Calculator', 'History', 'Standard']],
    ['image-viewer', ['Tardis Photos', 'orbits.png', 'DETAILS']],
    ['forms', ['Tardis Forms', 'Create your workspace', 'Full name']],
    ['virtual-10k', ['Tardis Directory', 'Ada Lovelace', '10,000 people.csv']],
    ['native-counter', ['Tardis Counter', 'One signal. Two hosts.']],
  ]

  it.each(cases)('%s mounts with its shell', async (entry, texts) => {
    const { app } = await mount(`examples/${entry}/app.tsx`)
    for (const text of texts) {
      expect(app.textContent).toContain(text)
    }
  }, 120_000)
})
