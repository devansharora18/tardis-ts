import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { compileTsx } from '../../src/compiler/tsx'
import {
  render,
  dispatchEvent,
  flushNow,
  createSignal,
  jsx,
  type HostOp,
  type Patch,
  type RenderHandle,
} from '../../src/scene/index'

const GEN = path.resolve(__dirname, 'gen')
let counter = 0
let patches: Patch[] = []
let handle: RenderHandle | null = null

beforeEach(() => {
  patches = []
  ;(globalThis as unknown as Record<string, unknown>)['__tardis_ts_flush'] = (
    json: string
  ): void => {
    patches.push(JSON.parse(json) as Patch)
  }
  fs.rmSync(GEN, { recursive: true, force: true })
  fs.mkdirSync(GEN, { recursive: true })
})

afterEach(() => {
  handle?.dispose()
  handle = null
  fs.rmSync(GEN, { recursive: true, force: true })
})

function allOps(): HostOp[] {
  return patches.flatMap((patch) => patch.ops)
}

function opsOf<T extends HostOp['op']>(op: T): Extract<HostOp, { op: T }>[] {
  return allOps().filter((entry): entry is Extract<HostOp, { op: T }> => entry.op === op)
}

function normalize(ops: HostOp[]): unknown[] {
  const ids = new Map<number, number>()
  const id = (value: number): number => {
    if (!ids.has(value)) ids.set(value, ids.size)
    return ids.get(value)!
  }
  return ops.map((entry) => {
    const base: Record<string, unknown> = { op: entry.op }
    if ('id' in entry) base['id'] = id(entry.id)
    if (entry.op === 'create') {
      base['kind'] = entry.kind
      base['parent'] = id(entry.parent)
      base['index'] = entry.index
    }
    if (entry.op === 'insert') {
      base['parent'] = id(entry.parent)
      base['index'] = entry.index
    }
    if (entry.op === 'style') base['props'] = entry.props
    if (entry.op === 'text') base['value'] = entry.value
    if (entry.op === 'image') {
      base['src'] = entry.src
      base['fit'] = entry.fit
    }
    if (entry.op === 'scroll') {
      base['x'] = entry.x
      base['y'] = entry.y
    }
    return base
  })
}

async function build(source: string, name: string): Promise<Record<string, unknown>> {
  counter++
  const result = compileTsx(source, `${name}.tsx`)
  expect(result.diagnostics).toEqual([])
  const code = result.code.replace(
    /from\s+['"](?:@devansharora18\/)?tardis-ts\/scene['"]/g,
    "from '../../../src/scene/index'"
  )
  const file = path.join(GEN, `${name}_${counter}.mjs`)
  fs.writeFileSync(file, code, 'utf8')
  return import(/* @vite-ignore */ pathToFileURL(file).href) as Promise<
    Record<string, unknown>
  >
}

describe('scene runtime', () => {
  it('renders a static tree in parent-first order', async () => {
    const mod = await build(
      `export const App = () => (
        <div>
          <h1>Hello</h1>
          <span>world</span>
        </div>
      )`,
      'Static'
    )
    handle = render(() => (mod.App as () => unknown)())
    const creates = opsOf('create')
    expect(creates.map((op) => op.kind)).toEqual(['view', 'text', 'text'])
    expect(creates[0]!.parent).toBe(0)
    expect(creates[1]!.parent).toBe(creates[0]!.id)
    expect(creates[2]!.parent).toBe(creates[0]!.id)
    const texts = opsOf('text').map((op) => op.value)
    expect(texts).toEqual(['Hello', 'world'])
    const h1 = opsOf('style').find((op) => op.props['fontSize'] === 32)
    expect(h1).toBeDefined()
  })

  it('updates dynamic text without recreating the node', async () => {
    const mod = await build(
      `import { createSignal } from '@devansharora18/tardis-ts/scene'
       export const [count, setCount] = createSignal(0)
       export const App = () => <h1>Count: {count()}</h1>`,
      'Counter'
    )
    handle = render(() => (mod.App as () => unknown)())
    const h1 = opsOf('create')[0]!
    expect(opsOf('text').at(-1)?.value).toBe('Count: 0')
    ;(mod.setCount as (value: number) => void)(3)
    flushNow()
    const textOps = opsOf('text').filter((op) => op.id === h1.id)
    expect(textOps.at(-1)?.value).toBe('Count: 3')
    expect(opsOf('create').filter((op) => op.id === h1.id)).toHaveLength(1)
  })

  it('updates reactive style props in place', async () => {
    const mod = await build(
      `import { createSignal } from '@devansharora18/tardis-ts/scene'
       export const [hot, setHot] = createSignal(false)
       export const App = () => (
         <div style={{ backgroundColor: hot() ? '#ff0000' : '#000000' }}>x</div>
       )`,
      'Style'
    )
    handle = render(() => (mod.App as () => unknown)())
    const div = opsOf('create')[0]!
    expect(opsOf('style').at(-1)?.props['backgroundColor']).toBe('#000000')
    ;(mod.setHot as (value: boolean) => void)(true)
    flushNow()
    const styles = opsOf('style').filter((op) => op.id === div.id)
    expect(styles.at(-1)?.props['backgroundColor']).toBe('#ff0000')
  })

  it('updates component props through getters', async () => {
    const mod = await build(
      `import { createSignal } from '@devansharora18/tardis-ts/scene'
       const Card = (props) => <h2>{props.title()}</h2>
       export const [title, setTitle] = createSignal('first')
       export const App = () => <div><Card title={title()} /></div>`,
      'Props'
    )
    handle = render(() => (mod.App as () => unknown)())
    expect(opsOf('text').at(-1)?.value).toBe('first')
    ;(mod.setTitle as (value: string) => void)('second')
    flushNow()
    expect(opsOf('text').at(-1)?.value).toBe('second')
  })

  it('clicks bubble from the text child to the button view', async () => {
    const mod = await build(
      `import { createSignal } from '@devansharora18/tardis-ts/scene'
       export const [clicks, setClicks] = createSignal(0)
       export const App = () => (
         <button onClick={() => setClicks(clicks() + 1)}>go</button>
       )`,
      'Click'
    )
    handle = render(() => (mod.App as () => unknown)())
    const text = opsOf('create').find((op) => op.kind === 'text')!
    dispatchEvent({ type: 'pointer', phase: 'down', node: text.id })
    dispatchEvent({ type: 'pointer', phase: 'up', node: text.id })
    flushNow()
    expect((mod.clicks as () => number)()).toBe(1)
  })

  it('swaps conditional branches', async () => {
    const mod = await build(
      `import { createSignal } from '@devansharora18/tardis-ts/scene'
       export const [on, setOn] = createSignal(true)
       export const App = () => <div>{on() ? <span>yes</span> : <span>no</span>}</div>`,
      'Conditional'
    )
    handle = render(() => (mod.App as () => unknown)())
    expect(opsOf('text').map((op) => op.value)).toContain('yes')
    ;(mod.setOn as (value: boolean) => void)(false)
    flushNow()
    expect(opsOf('destroy').length).toBeGreaterThan(0)
    expect(opsOf('text').map((op) => op.value)).toContain('no')
  })

  it('rebuilds dynamic arrays with new content', async () => {
    const mod = await build(
      `import { createSignal } from '@devansharora18/tardis-ts/scene'
       export const [items, setItems] = createSignal(['a', 'b'])
       export const App = () => (
         <div>{items().map((item) => <span key={item}>{item}</span>)}</div>
       )`,
      'List'
    )
    handle = render(() => (mod.App as () => unknown)())
    expect(opsOf('text').map((op) => op.value)).toEqual(
      expect.arrayContaining(['a', 'b'])
    )
    ;(mod.setItems as (value: string[]) => void)(['a', 'c'])
    flushNow()
    expect(opsOf('text').map((op) => op.value)).toContain('c')
  })

  it('stops effects after dispose', async () => {
    const mod = await build(
      `import { createSignal } from '@devansharora18/tardis-ts/scene'
       export const [count, setCount] = createSignal(0)
       export const App = () => <h1>{count()}</h1>`,
      'Dispose'
    )
    handle = render(() => (mod.App as () => unknown)())
    const before = opsOf('text').length
    handle.dispose()
    handle = null
    ;(mod.setCount as (value: number) => void)(9)
    flushNow()
    expect(opsOf('text')).toHaveLength(before)
  })

  it('mounts fragments and arrays', async () => {
    const mod = await build(
      `export const App = () => <>{[<span>a</span>, <span>b</span>]}</>`,
      'Fragment'
    )
    handle = render(() => (mod.App as () => unknown)())
    expect(opsOf('create').filter((op) => op.kind === 'text')).toHaveLength(2)
  })

  it('throws for unknown intrinsic tags', () => {
    expect(() => jsx('marquee', {}, 'x')).toThrow(/unknown element <marquee>/)
  })

  it('is deterministic across identical renders once ids are normalized', async () => {
    const mod = await build(`export const App = () => <div><p>same</p></div>`, 'Same')
    handle = render(() => (mod.App as () => unknown)())
    const first = normalize(allOps())
    handle.dispose()
    handle = null
    patches = []
    handle = render(() => (mod.App as () => unknown)())
    const second = normalize(allOps())
    expect(second).toEqual(first)
  })

  it('exports a standalone signal API', () => {
    const [n, setN] = createSignal(1)
    expect(n()).toBe(1)
    setN(2)
    expect(n()).toBe(2)
  })
})
