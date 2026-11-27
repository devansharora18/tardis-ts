import { describe, expect, it } from 'vitest'
import { parseMarkdown, readingMinutes, wordCount } from '../../examples/word/markdown'

describe('word markdown', () => {
  it('parses headings, lists, quotes, and tables', () => {
    const blocks = parseMarkdown(`# Title

Intro paragraph.

## Section

- first
- second

1. one
2. two

> quoted

| Metric | Q4 |
| --- | --- |
| Revenue | 24,196 |
`)
    expect(blocks.map((block) => block.type)).toEqual([
      'h1',
      'p',
      'h2',
      'li',
      'li',
      'li',
      'li',
      'quote',
      'table',
    ])
    expect(blocks[3]?.marker).toBe('•')
    expect(blocks[5]?.marker).toBe('1.')
    const table = blocks[8]
    expect(table?.rows).toEqual([
      ['Metric', 'Q4'],
      ['Revenue', '24,196'],
    ])
  })

  it('counts words and reading time', () => {
    expect(wordCount('')).toBe(0)
    expect(wordCount('one two three')).toBe(3)
    expect(readingMinutes('word '.repeat(300))).toBe(2)
  })
})
