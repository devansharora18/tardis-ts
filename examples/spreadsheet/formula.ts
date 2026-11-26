// Minimal spreadsheet formula engine.
//
// Supports numbers, + - * /, parentheses, cell references (A1), ranges
// (A1:B3), and SUM/AVERAGE/MIN/MAX. Errors surface as #ERROR! or #CYCLE!.

export type Cells = Record<string, string>

const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function columnName(index: number): string {
  let value = index
  let name = ''
  do {
    name = COLUMNS[value % 26]! + name
    value = Math.floor(value / 26) - 1
  } while (value >= 0)
  return name
}

export function cellRef(row: number, column: number): string {
  return `${columnName(column)}${row + 1}`
}

export function parseRef(ref: string): { row: number; column: number } | null {
  const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(ref.toUpperCase())
  if (!match) return null
  let column = 0
  for (const char of match[1]!) {
    column = column * 26 + (char.charCodeAt(0) - 64)
  }
  return { row: Number.parseInt(match[2]!, 10) - 1, column: column - 1 }
}

function numeric(ref: string, cells: Cells, depth: number): number {
  const raw = (cells[ref] ?? '').trim()
  if (raw === '') return 0
  if (raw.startsWith('=')) {
    const value = evaluateRaw(raw.slice(1), cells, depth + 1)
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

class Parser {
  private index = 0
  constructor(
    private readonly source: string,
    private readonly cells: Cells,
    private readonly depth: number
  ) {}

  parse(): number {
    const value = this.expression()
    this.spaces()
    if (this.index < this.source.length) throw new Error('trailing input')
    return value
  }

  private spaces(): void {
    while (/\s/.test(this.source[this.index] ?? '')) this.index += 1
  }

  private peek(): string {
    this.spaces()
    return this.source[this.index] ?? ''
  }

  private take(char: string): boolean {
    if (this.peek() !== char) return false
    this.index += 1
    return true
  }

  private expression(): number {
    let value = this.term()
    while (true) {
      if (this.take('+')) value += this.term()
      else if (this.take('-')) value -= this.term()
      else return value
    }
  }

  private term(): number {
    let value = this.factor()
    while (true) {
      if (this.take('*')) value *= this.factor()
      else if (this.take('/')) {
        const divisor = this.factor()
        value = divisor === 0 ? Number.NaN : value / divisor
      } else return value
    }
  }

  private factor(): number {
    const char = this.peek()
    if (char === '-') {
      this.index += 1
      return -this.factor()
    }
    if (char === '+') {
      this.index += 1
      return this.factor()
    }
    if (char === '(') {
      this.index += 1
      const value = this.expression()
      if (!this.take(')')) throw new Error('missing )')
      return value
    }
    const number = /^[0-9]+(?:\.[0-9]+)?/.exec(this.source.slice(this.index))
    if (number) {
      this.index += number[0].length
      return Number.parseFloat(number[0])
    }
    const name = /^[A-Za-z]+[0-9]+/.exec(this.source.slice(this.index))
    if (name) {
      this.index += name[0].length
      const ref = name[0].toUpperCase()
      if (this.depth > 16) throw new Error('cycle')
      return numeric(ref, this.cells, this.depth)
    }
    const fn = /^[A-Za-z]+/.exec(this.source.slice(this.index))
    if (fn) {
      this.index += fn[0].length
      return this.call(fn[0].toUpperCase())
    }
    throw new Error('unexpected token')
  }

  private call(name: string): number {
    if (!this.take('(')) throw new Error('missing (')
    const values: number[] = []
    if (this.peek() !== ')') {
      do {
        const range = this.range()
        if (range) values.push(...range)
        else values.push(this.expression())
      } while (this.take(','))
    }
    if (!this.take(')')) throw new Error('missing )')
    const valid = values.filter((value) => Number.isFinite(value))
    switch (name) {
      case 'SUM':
        return valid.reduce((sum, value) => sum + value, 0)
      case 'AVERAGE':
        return valid.length === 0
          ? 0
          : valid.reduce((sum, value) => sum + value, 0) / valid.length
      case 'MIN':
        return valid.length === 0 ? 0 : Math.min(...valid)
      case 'MAX':
        return valid.length === 0 ? 0 : Math.max(...valid)
      default:
        throw new Error(`unknown function ${name}`)
    }
  }

  private range(): number[] | null {
    this.spaces()
    const start = /^[A-Za-z]+[0-9]+/.exec(this.source.slice(this.index))
    if (!start) return null
    const afterStart = this.index + start[0].length
    if (this.source[afterStart] !== ':') return null
    this.index = afterStart + 1
    const end = /^[A-Za-z]+[0-9]+/.exec(this.source.slice(this.index))
    if (!end) throw new Error('bad range')
    this.index += end[0].length
    const from = parseRef(start[0])
    const to = parseRef(end[0])
    if (!from || !to) throw new Error('bad range')
    const values: number[] = []
    for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row += 1) {
      for (
        let column = Math.min(from.column, to.column);
        column <= Math.max(from.column, to.column);
        column += 1
      ) {
        if (this.depth > 16) throw new Error('cycle')
        values.push(numeric(cellRef(row, column), this.cells, this.depth))
      }
    }
    return values
  }
}

function evaluateRaw(source: string, cells: Cells, depth: number): number {
  if (depth > 16) throw new Error('cycle')
  return new Parser(source, cells, depth).parse()
}

/** Display value for a cell (raw text or evaluated formula). */
export function displayCell(ref: string, cells: Cells): string {
  const raw = cells[ref] ?? ''
  if (!raw.startsWith('=')) return raw
  try {
    const value = evaluateRaw(raw.slice(1), cells, 0)
    if (!Number.isFinite(value)) return '#ERROR!'
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
  } catch (reason) {
    return String(reason).includes('cycle') ? '#CYCLE!' : '#ERROR!'
  }
}
