import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { bundleApp } from '../../src/compiler/bundle'

const root = path.resolve(__dirname, '../..')
const nativeDir = path.join(root, 'native')
const bin = path.join(nativeDir, 'target', 'debug', 'tardis-native')
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
})
