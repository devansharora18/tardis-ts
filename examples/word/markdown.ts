export type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'quote' | 'code'

export interface Block {
  type: BlockType
  text: string
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let code: string[] | null = null
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push({ type: 'code', text: code.join('\n') })
        code = null
      } else {
        code = []
      }
      continue
    }
    if (code) {
      code.push(line)
      continue
    }
    if (line.trim() === '') continue
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({
        type: `h${heading[1]!.length}` as BlockType,
        text: heading[2]!,
      })
      continue
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      blocks.push({ type: 'li', text: bullet[1]! })
      continue
    }
    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      blocks.push({ type: 'quote', text: quote[1]! })
      continue
    }
    const previous = blocks[blocks.length - 1]
    if (previous && previous.type === 'p') previous.text += ` ${line.trim()}`
    else blocks.push({ type: 'p', text: line.trim() })
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
