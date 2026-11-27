import { jsx, type SceneNode } from '@devansharora18/tardis-ts/scene'

type Block =
  | { type: 'h'; level: number; text: string; id: string }
  | { type: 'p'; text: string }
  | { type: 'code'; text: string }
  | { type: 'li'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'rule' }
  | { type: 'table'; rows: string[][] }

export function parseDoc(source: string): Block[] {
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
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({
        type: 'h',
        level: heading[1]!.length,
        text: heading[2]!,
        id: `h-${blocks.length}`,
      })
      index += 1
      continue
    }
    if (line.trim() === '---') {
      blocks.push({ type: 'rule' })
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
      blocks.push({ type: 'table', rows })
      continue
    }
    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      blocks.push({ type: 'quote', text: quote[1]! })
      index += 1
      continue
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      blocks.push({ type: 'li', text: bullet[1]! })
      index += 1
      continue
    }
    const paragraph: string[] = [line.trim()]
    index += 1
    while (
      index < lines.length &&
      lines[index]!.trim() !== '' &&
      !/^(#{1,4})\s|^```|^\s*[-*+]\s|^>|^\|/.test(lines[index]!)
    ) {
      paragraph.push(lines[index]!.trim())
      index += 1
    }
    blocks.push({ type: 'p', text: paragraph.join(' ') })
  }
  return blocks
}

function inline(text: string): SceneNode[] {
  const parts: SceneNode[] = []
  const regex = /`([^`]+)`|\*\*([^*]+)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    if (match.index > last) {
      parts.push(jsx('span', {}, text.slice(last, match.index)))
    }
    if (match[1]) {
      parts.push(
        jsx(
          'span',
          { className: 'inline-code' },
          match[1]
        )
      )
    } else {
      parts.push(jsx('strong', {}, match[2]!))
    }
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(jsx('span', {}, text.slice(last)))
  return parts
}

export function Markdown(props: { source: string }): SceneNode {
  const blocks = parseDoc(props.source)
  return jsx(
    'div',
    { className: 'doc-body' },
    ...blocks.map((block, index) => {
      if (block.type === 'h') {
        if (block.level === 1) return null
        if (block.level === 2) {
          return jsx(
            'h2',
            { key: index, className: block.id },
            block.text
          )
        }
        if (block.level === 3) {
          return jsx('h3', { key: index, className: block.id }, block.text)
        }
        return jsx('h4', { key: index }, block.text)
      }
      if (block.type === 'code') {
        return jsx('div', { key: index, className: 'code-block' }, block.text)
      }
      if (block.type === 'li') {
        return jsx(
          'div',
          { key: index, className: 'doc-li' },
          jsx('span', { className: 'doc-bullet' }, '•'),
          jsx('span', {}, ...inline(block.text))
        )
      }
      if (block.type === 'quote') {
        return jsx('div', { key: index, className: 'doc-quote' }, ...inline(block.text))
      }
      if (block.type === 'rule') {
        return jsx('div', { key: index, className: 'doc-rule' })
      }
      if (block.type === 'table') {
        const [head, ...body] = block.rows
        if (!head) return null
        return jsx(
          'div',
          { key: index, className: 'table-wrap' },
          jsx(
            'div',
            { className: 'doc-table' },
            jsx(
              'div',
              { className: 'doc-row doc-head' },
              ...head.map((cell) => jsx('span', { key: cell }, cell))
            ),
            ...body.map((row, rowIndex) =>
              jsx(
                'div',
                { key: rowIndex, className: 'doc-row' },
                ...row.map((cell, cellIndex) =>
                  jsx('span', { key: cellIndex }, cell)
                )
              )
            )
          )
        )
      }
      return jsx('div', { key: index, className: 'doc-p' }, ...inline(block.text))
    })
  )
}

export function outline(source: string): Array<{ id: string; text: string }> {
  return parseDoc(source)
    .filter((block) => block.type === 'h' && block.level === 2)
    .map((block) => ({
      id: block.type === 'h' ? block.id : '',
      text: block.type === 'h' ? block.text : '',
    }))
}
