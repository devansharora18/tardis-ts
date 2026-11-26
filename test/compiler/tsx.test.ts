import { describe, it, expect } from 'vitest'
import { compileTsx, cleanJsxText } from '../../src/compiler/tsx'

function compile(source: string): string {
  const result = compileTsx(source, 'app.tsx')
  expect(result.diagnostics).toEqual([])
  return result.code
}

describe('tsx compiler', () => {
  it('emits a runtime import only when JSX is used', () => {
    const out = compile(`const x = 1\nexport const y = x + 1\n`)
    expect(out).not.toContain('@devansharora18/tardisjs/scene')
  })

  it('compiles intrinsics with string tags and components with identifiers', () => {
    const out = compile(`
      const Card = () => <section />
      export const A = () => <div><Card /></div>
    `)
    expect(out).toContain('_tjsx("div"')
    expect(out).toContain('_tjsx(Card')
  })

  it('wraps dynamic children and dynamic props', () => {
    const out = compile(`
      export const A = (props) => <div title={props.name()}>Count: {props.count()}</div>
    `)
    expect(out).toContain('title: () => props.name()')
    expect(out).toContain('_tdynamic(() => props.count())')
  })

  it('keeps event handlers unwrapped', () => {
    const out = compile(`export const A = () => <button onClick={() => go(1)}>go</button>`)
    expect(out).toContain('onClick: () => go(1)')
    expect(out).not.toContain('onClick: () => () =>')
  })

  it('keeps function-valued props unwrapped', () => {
    const out = compile(`export const A = () => <List renderItem={(x) => <Row item={x} />} />`)
    expect(out).toContain('renderItem: (x) => _tjsx(Row')
    expect(out).toContain('item: () => x')
  })

  it('keeps key unwrapped and wraps other expression props', () => {
    const out = compile(`export const A = (p) => <Row key={p.id} title={p.title()} />`)
    expect(out).toContain('key: p.id')
    expect(out).toContain('title: () => p.title()')
  })

  it('handles fragments', () => {
    const out = compile(`export const A = () => <>a<b>c</b></>`)
    expect(out).toContain('_tjsx(_tFragment')
    expect(out).toContain('"a"')
    expect(out).toContain('_tjsx("b"')
  })

  it('transforms nested JSX inside conditional expressions', () => {
    const out = compile(`
      export const A = (p) => <div>{p.on() ? <span>yes</span> : <span>no</span>}</div>
    `)
    expect(out).toContain('_tdynamic(() => p.on() ? _tjsx("span"')
    expect(out).toContain('"yes"')
    expect(out).toContain('"no"')
  })

  it('transforms JSX inside array maps', () => {
    const out = compile(`
      export const A = (p) => <div>{p.items().map((item) => <Row key={item.id} title={item.name} />)}</div>
    `)
    expect(out).toContain('_tdynamic(() => p.items().map((item) => _tjsx(Row')
    expect(out).toContain('key: item.id')
    expect(out).toContain('title: () => item.name')
  })

  it('spreads props in source order', () => {
    const out = compile(`export const A = (p) => <Card {...p.attrs} title="x" />`)
    expect(out).toContain('...p.attrs')
    expect(out).toContain('title: "x"')
  })

  it('supports member-expression components', () => {
    const out = compile(`export const A = () => <UI.Card title="x" />`)
    expect(out).toContain('_tjsx(UI.Card')
  })

  it('reports unsupported namespaced attributes', () => {
    const result = compileTsx(`export const A = () => <div xmlns:foo="x" />`, 'a.tsx')
    expect(result.diagnostics.join('\n')).toContain('unsupported JSX attribute')
  })

  it('reports TypeScript syntax errors instead of emitting garbage', () => {
    const result = compileTsx(`export const A = () => <div>`, 'a.tsx')
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })

  it('preserves whitespace between inline elements', () => {
    const out = compile(`export const A = () => <p>Hello <b>world</b></p>`)
    expect(out).toContain('"Hello "')
    expect(out).toContain('_tjsx("b"')
  })

  it('drops indentation-only text', () => {
    const out = compile(`
      export const A = () => (
        <div>
          <span>a</span>
          <span>b</span>
        </div>
      )
    `)
    const calls = out.match(/_tjsx\("span"/g) ?? []
    expect(calls).toHaveLength(2)
    expect(out).not.toContain('"   "')
  })
})

describe('cleanJsxText', () => {
  it('collapses inline runs', () => {
    expect(cleanJsxText('a   b')).toBe('a b')
  })
  it('drops leading and trailing newline indentation', () => {
    expect(cleanJsxText('\n   hello\n  ')).toBe('hello')
  })
  it('keeps a trailing inline space', () => {
    expect(cleanJsxText('\n  hello ')).toBe('hello ')
  })
  it('keeps a space-only inline node', () => {
    expect(cleanJsxText(' ')).toBe(' ')
  })
  it('drops whitespace-only multiline nodes', () => {
    expect(cleanJsxText('\n    \n  ')).toBe('')
  })
})
