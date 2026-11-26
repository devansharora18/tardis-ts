// Small, per-line syntax highlighter for the editor demo.
//
// Not a parser: it tokenizes the visible line into VS Code-like colors. It is
// intentionally lightweight and runs inside the reactive editor render.

export type Language = 'ts' | 'css' | 'markdown' | 'text'

export interface SyntaxToken {
  start: number
  end: number
  color: string
  fontWeight?: number
}

const COLORS = {
  keyword: '#569cd6',
  control: '#c586c0',
  string: '#ce9178',
  number: '#b5cea8',
  comment: '#6a9955',
  type: '#4ec9b0',
  function: '#dcdcaa',
  property: '#9cdcfe',
  punctuation: '#d4d4d4',
  heading: '#569cd6',
  tag: '#d7ba7d',
}

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'export',
  'import',
  'from',
  'default',
  'return',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'class',
  'extends',
  'implements',
  'interface',
  'type',
  'enum',
  'async',
  'await',
  'try',
  'catch',
  'throw',
  'finally',
  'typeof',
  'instanceof',
  'in',
  'of',
  'as',
  'void',
  'never',
  'unknown',
  'string',
  'number',
  'boolean',
])

const CONTROL = new Set(['if', 'else', 'for', 'while', 'switch', 'case', 'return'])
const LITERALS = new Set(['true', 'false', 'null', 'undefined'])

function tokenizeTs(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = []
  let index = 0
  const add = (start: number, end: number, color: string, weight?: number): void => {
    if (end > start) tokens.push({ start, end, color, fontWeight: weight })
  }

  while (index < line.length) {
    const char = line[index]!
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    const rest = line.slice(index)
    const comment = /^\/\/.*/.exec(rest) ?? /^\/\*.*?(?:\*\/|$)/.exec(rest)
    if (comment) {
      add(index, index + comment[0].length, COLORS.comment)
      index += comment[0].length
      continue
    }
    const string = /^"(?:\\.|[^"\\])*"?/.exec(rest) ??
      /^'(?:\\.|[^'\\])*'?/.exec(rest) ??
      /^`(?:\\.|[^`\\])*`?/.exec(rest)
    if (string) {
      add(index, index + string[0].length, COLORS.string)
      index += string[0].length
      continue
    }
    const number = /^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/.exec(rest)
    if (number) {
      add(index, index + number[0].length, COLORS.number)
      index += number[0].length
      continue
    }
    const word = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(rest)
    if (word) {
      const value = word[0]
      const after = line.slice(index + value.length)
      let color = '#d4d4d4'
      let weight: number | undefined
      if (CONTROL.has(value)) color = COLORS.control
      else if (KEYWORDS.has(value)) color = COLORS.keyword
      else if (LITERALS.has(value)) color = COLORS.keyword
      else if (/^\s*\(/.test(after)) {
        color = COLORS.function
        weight = 400
      } else if (/^[A-Z]/.test(value)) color = COLORS.type
      else if (line[index - 1] === '.') color = COLORS.property
      add(index, index + value.length, color, weight)
      index += value.length
      continue
    }
    const punctuation = /^[{}()[\].,;:+\-*/%=<>!&|?~^]+/.exec(rest)
    if (punctuation) {
      add(index, index + punctuation[0].length, COLORS.punctuation)
      index += punctuation[0].length
      continue
    }
    index += 1
  }
  return tokens
}

function tokenizeCss(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = []
  const add = (start: number, end: number, color: string): void => {
    if (end > start) tokens.push({ start, end, color })
  }
  const comment = line.indexOf('/*')
  const body = comment === -1 ? line : line.slice(0, comment)
  if (comment !== -1) add(comment, line.length, COLORS.comment)
  const property = /^(\s*)([-a-zA-Z]+)(\s*:)/.exec(body)
  if (property) {
    const start = property[1]!.length
    add(start, start + property[2]!.length, COLORS.property)
    const valueStart = property[0].length
    const value = body.slice(valueStart)
    const valueMatch = /^(\s*)([^;{}]+)/.exec(value)
    if (valueMatch) {
      const offset = valueStart + valueMatch[1]!.length
      const text = valueMatch[2]!
      const color = /^['"]/.test(text)
        ? COLORS.string
        : /^#?[0-9]/.test(text)
          ? COLORS.number
          : COLORS.tag
      add(offset, offset + text.length, color)
    }
  } else {
    const selector = /^(\s*)([^@{};][^{}]*)(\{?)/.exec(body)
    if (selector) {
      const start = selector[1]!.length
      add(start, start + selector[2]!.length, COLORS.tag)
    }
  }
  return tokens
}

function tokenizeMarkdown(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = []
  const add = (start: number, end: number, color: string, weight?: number): void => {
    if (end > start) tokens.push({ start, end, color, fontWeight: weight })
  }
  if (/^#{1,6}\s/.test(line)) {
    add(0, line.length, COLORS.heading, 700)
    return tokens
  }
  const list = /^(\s*)([-*+]|\d+\.)\s/.exec(line)
  if (list) add(list[1]!.length, list[1]!.length + list[2]!.length, COLORS.keyword)
  const inline = /`([^`]+)`/g
  let match: RegExpExecArray | null
  while ((match = inline.exec(line))) {
    add(match.index, match.index + match[0].length, COLORS.string)
  }
  const bold = /\*\*([^*]+)\*\*/g
  while ((match = bold.exec(line))) {
    add(match.index, match.index + match[0].length, '#d4d4d4', 700)
  }
  return tokens
}

export function tokenize(line: string, language: Language): SyntaxToken[] {
  if (language === 'ts') return tokenizeTs(line)
  if (language === 'css') return tokenizeCss(line)
  if (language === 'markdown') return tokenizeMarkdown(line)
  return []
}
