import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { bundleApp } from '../../src/compiler/bundle'

const root = path.resolve(__dirname, '../..')
const nativeDir = path.join(root, 'native')
const headlessTarget = path.join(nativeDir, 'target', 'headless')
const bin = path.join(
  headlessTarget,
  'debug',
  process.platform === 'win32' ? 'tardis-native.exe' : 'tardis-native'
)
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tardis-e2e-'))

interface Dump {
  width: number
  height: number
  nodes: Array<{
    id: number
    kind: string
    x: number
    y: number
    width: number
    height: number
    text: string | null
    children: number[]
  }>
}

beforeAll(() => {
  execFileSync('cargo', ['build', '--no-default-features'], {
    cwd: nativeDir,
    stdio: 'pipe',
    env: { ...process.env, CARGO_TARGET_DIR: headlessTarget },
  })
})

afterAll(() => {
  fs.rmSync(temp, { recursive: true, force: true })
})

function run(args: string[]): { status: number; stderr: string } {
  const result = spawnSync(bin, args, { encoding: 'utf8' })
  return {
    status: result.status ?? 1,
    stderr: `${result.stderr ?? ''}${result.stdout ?? ''}`,
  }
}

function readDump(file: string): Dump {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Dump
}

describe('native end to end', () => {
  it('compiles tsx, runs quickjs, lays out, clicks, and re-renders', async () => {
    const bundle = path.join(temp, 'app.js')
    const built = await bundleApp({
      entry: path.join(root, 'examples/native-counter/app.tsx'),
      outfile: bundle,
      minify: false,
    })
    expect(built.bytes).toBeGreaterThan(1000)

    const initialPng = path.join(temp, 'initial.png')
    const initialDump = path.join(temp, 'initial.json')
    const first = run([
      '--headless',
      '--bundle',
      bundle,
      '--width',
      '800',
      '--height',
      '600',
      '--out',
      initialPng,
      '--dump',
      initialDump,
    ])
    expect(first.status, first.stderr).toBe(0)
    expect(fs.existsSync(initialPng)).toBe(true)
    expect(fs.statSync(initialPng).size).toBeGreaterThan(1000)

    const dump = readDump(initialDump)
    const countNode = dump.nodes.find((node) => node.text === 'Count: 0')
    expect(countNode).toBeDefined()
    const buttonText = dump.nodes.find((node) => node.text === 'Increment')
    expect(buttonText).toBeDefined()
    const button = dump.nodes.find((node) => node.children.includes(buttonText!.id))
    expect(button).toBeDefined()
    expect(button!.width).toBeGreaterThan(100)

    const x = button!.x + button!.width / 2
    const y = button!.y + button!.height / 2
    const clickedPng = path.join(temp, 'clicked.png')
    const clickedDump = path.join(temp, 'clicked.json')
    const second = run([
      '--headless',
      '--bundle',
      bundle,
      '--width',
      '800',
      '--height',
      '600',
      '--out',
      clickedPng,
      '--dump',
      clickedDump,
      '--click',
      `${x},${y}`,
    ])
    expect(second.status, second.stderr).toBe(0)

    const after = readDump(clickedDump)
    expect(after.nodes.some((node) => node.text === 'Count: 1')).toBe(true)
    expect(fs.existsSync(clickedPng)).toBe(true)
    expect(fs.statSync(clickedPng).size).toBeGreaterThan(1000)
  }, 300_000)

  it('mounts only a window of a 10k virtual list and scrolls', async () => {
    const bundle = path.join(temp, 'virtual.js')
    await bundleApp({
      entry: path.join(root, 'examples/virtual-10k/app.tsx'),
      outfile: bundle,
    })

    const initialDump = path.join(temp, 'virtual-initial.json')
    const first = run([
      '--headless',
      '--bundle',
      bundle,
      '--width',
      '800',
      '--height',
      '600',
      '--out',
      path.join(temp, 'virtual-initial.png'),
      '--dump',
      initialDump,
    ])
    expect(first.status, first.stderr).toBe(0)
    const initial = readDump(initialDump)
    expect(initial.nodes.length).toBeLessThan(100)
    const initialTexts = initial.nodes
      .map((node) => node.text)
      .filter((text): text is string => Boolean(text))
    expect(initialTexts).toContain('Row 0')
    expect(initialTexts).not.toContain('Row 5000')

    const scrolledDump = path.join(temp, 'virtual-scrolled.json')
    const second = run([
      '--headless',
      '--bundle',
      bundle,
      '--width',
      '800',
      '--height',
      '600',
      '--out',
      path.join(temp, 'virtual-scrolled.png'),
      '--dump',
      scrolledDump,
      '--wheel',
      '400,300,400',
    ])
    expect(second.status, second.stderr).toBe(0)
    const scrolled = readDump(scrolledDump)
    expect(scrolled.nodes.length).toBeLessThan(100)
    const scrolledTexts = scrolled.nodes
      .map((node) => node.text)
      .filter((text): text is string => Boolean(text))
    expect(scrolledTexts).toContain('Row 8')
    expect(scrolledTexts).not.toContain('Row 0')
  }, 300_000)

  it('renders accessible form fields and a checkbox natively', async () => {
    const bundle = path.join(temp, 'forms.js')
    await bundleApp({
      entry: path.join(root, 'examples/forms/app.tsx'),
      outfile: bundle,
    })
    const dumpPath = path.join(temp, 'forms.json')
    const result = run([
      '--headless',
      '--bundle',
      bundle,
      '--width',
      '800',
      '--height',
      '600',
      '--out',
      path.join(temp, 'forms.png'),
      '--dump',
      dumpPath,
    ])
    expect(result.status, result.stderr).toBe(0)
    const dump = readDump(dumpPath)
    const texts = dump.nodes
      .map((node) => node.text)
      .filter((text): text is string => Boolean(text))
    expect(texts).toContain('Form')
    expect(texts).toContain('Name')
    expect(texts).toContain('Email')
    expect(texts).toContain('Subscribe')
    expect(texts).toContain('Not submitted')
  }, 300_000)
})
