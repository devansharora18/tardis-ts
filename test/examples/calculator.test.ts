import { describe, expect, it } from 'vitest'
import { calculate } from '../../examples/calculator/calc'

describe('calculator', () => {
  it('evaluates precedence and parentheses', () => {
    expect(calculate('2+3*4')).toBe('14')
    expect(calculate('(2+3)*4')).toBe('20')
    expect(calculate('10/4')).toBe('2.5')
    expect(calculate('-3+5')).toBe('2')
    expect(calculate('10%4')).toBe('2')
  })
  it('reports malformed input without throwing', () => {
    expect(calculate('2+')).toBe('Error')
    expect(calculate('1/0')).toBe('Error')
    expect(calculate('(2+3')).toBe('Error')
  })
})
