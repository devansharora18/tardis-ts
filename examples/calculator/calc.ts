export function calculate(expression: string): string {
  const source = expression.replace(/\s+/g, '')
  if (source === '') return ''
  let index = 0
  const peek = (): string => source[index] ?? ''
  const expressionParser = (): number => {
    let value = term()
    while (peek() === '+' || peek() === '-') {
      const op = peek()
      index += 1
      const right = term()
      value = op === '+' ? value + right : value - right
    }
    return value
  }
  const term = (): number => {
    let value = factor()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = peek()
      index += 1
      const right = factor()
      if (op === '*') value *= right
      else if (op === '/') value = right === 0 ? Number.NaN : value / right
      else value %= right
    }
    return value
  }
  const factor = (): number => {
    if (peek() === '-') {
      index += 1
      return -factor()
    }
    if (peek() === '+') {
      index += 1
      return factor()
    }
    if (peek() === '(') {
      index += 1
      const value = expressionParser()
      if (peek() !== ')') throw new Error('missing )')
      index += 1
      return value
    }
    const match = /^[0-9]+(?:\.[0-9]+)?/.exec(source.slice(index))
    if (!match) throw new Error('expected number')
    index += match[0].length
    return Number.parseFloat(match[0])
  }
  try {
    const value = expressionParser()
    if (index !== source.length || !Number.isFinite(value)) return 'Error'
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)))
  } catch {
    return 'Error'
  }
}
