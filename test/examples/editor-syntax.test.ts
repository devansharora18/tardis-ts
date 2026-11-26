import { describe, expect, it } from 'vitest'
import { tokenize } from '../../examples/editor/syntax'

describe('editor syntax highlighter', () => {
  it('colors keywords, strings, numbers, and comments', () => {
    const line = `export const name = "tardis" // 42`
    const tokens = tokenize(line, 'ts')
    const at = (word: string) => {
      const start = line.indexOf(word)
      return tokens.find((token) => token.start === start)
    }
    expect(at('export')?.color).toBe('#569cd6')
    expect(at('"tardis"')?.color).toBe('#ce9178')
    expect(at('// 42')?.color).toBe('#6a9955')
    expect(at('name')?.color).toBe('#d4d4d4')
  })

  it('colors CSS properties and markdown headings', () => {
    const css = '  color: #ff0000;'
    const property = tokenize(css, 'css').find((token) => token.start === 2)
    expect(property?.color).toBe('#9cdcfe')
    const heading = tokenize('## Shortcuts', 'markdown')[0]
    expect(heading?.color).toBe('#569cd6')
  })
})
