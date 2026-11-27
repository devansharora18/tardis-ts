export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'p'
  | 'li'
  | 'quote'
  | 'code'
  | 'table'
  | 'rule'

export interface Block {
  type: BlockType
  text: string
  marker?: string
  rows?: string[][]
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let code: string[] | null = null
  let index = 0
  while (index < lines.length) {
    const line = lines[index]!
    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push({ type: 'code', text: code.join('\n') })
        code = null
      } else {
        code = []
      }
      index += 1
      continue
    }
    if (code) {
      code.push(line)
      index += 1
      continue
    }
    if (line.trim() === '') {
      index += 1
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({
        type: `h${heading[1]!.length}` as BlockType,
        text: heading[2]!,
      })
      index += 1
      continue
    }
    if (line.trim() === '---') {
      blocks.push({ type: 'rule', text: '' })
      index += 1
      continue
    }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = []
      while (index < lines.length && lines[index]!.trim().startsWith('|')) {
        const raw = lines[index]!.trim()
        if (!/^\|?[\s:-]+\|[\s:|-]+$/.test(raw)) {
          rows.push(
            raw
              .replace(/^\|/, '')
              .replace(/\|$/, '')
              .split('|')
              .map((cell) => cell.trim())
          )
        }
        index += 1
      }
      blocks.push({ type: 'table', text: '', rows })
      continue
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      blocks.push({ type: 'li', text: bullet[1]!, marker: '•' })
      index += 1
      continue
    }
    const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line)
    if (numbered) {
      blocks.push({ type: 'li', text: numbered[2]!, marker: `${numbered[1]}.` })
      index += 1
      continue
    }
    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      blocks.push({ type: 'quote', text: quote[1]! })
      index += 1
      continue
    }
    const paragraph: string[] = [line.trim()]
    index += 1
    while (
      index < lines.length &&
      lines[index]!.trim() !== '' &&
      !/^(#{1,4})\s|^```|^\s*[-*+]\s|^\s*\d+\.\s|^>|^\|/.test(lines[index]!)
    ) {
      paragraph.push(lines[index]!.trim())
      index += 1
    }
    blocks.push({ type: 'p', text: paragraph.join(' ') })
  }
  if (code) blocks.push({ type: 'code', text: code.join('\n') })
  return blocks
}

export function wordCount(source: string): number {
  const text = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`-]/g, ' ')
    .trim()
  return text === '' ? 0 : text.split(/\s+/).length
}

export function readingMinutes(source: string): number {
  return Math.max(1, Math.ceil(wordCount(source) / 220))
}
