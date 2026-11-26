import { describe, expect, it } from 'vitest'
import {
  cellRef,
  columnName,
  displayCell,
  parseRef,
  type Cells,
} from '../../examples/spreadsheet/formula'

describe('spreadsheet formulas', () => {
  it('maps cell references', () => {
    expect(cellRef(0, 0)).toBe('A1')
    expect(cellRef(9, 2)).toBe('C10')
    expect(columnName(25)).toBe('Z')
    expect(columnName(26)).toBe('AA')
    expect(parseRef('AA12')).toEqual({ row: 11, column: 26 })
    expect(parseRef('bad')).toBeNull()
  })

  it('evaluates arithmetic, references, and ranges', () => {
    const cells: Cells = {
      A1: '2',
      A2: '3',
      A3: '=A1+A2*4',
      A4: '=SUM(A1:A3)',
      A5: '=AVERAGE(A1:A2)',
      A6: '=(A1+A2)/2',
      A7: '=MIN(A1:A2)',
      A8: '=MAX(A1:A2)',
      A9: '=1/0',
    }
    expect(displayCell('A3', cells)).toBe('14')
    expect(displayCell('A4', cells)).toBe('19')
    expect(displayCell('A5', cells)).toBe('2.5')
    expect(displayCell('A6', cells)).toBe('2.5')
    expect(displayCell('A7', cells)).toBe('2')
    expect(displayCell('A8', cells)).toBe('3')
    expect(displayCell('A9', cells)).toBe('#ERROR!')
  })

  it('reports cycles and bad syntax', () => {
    const cells: Cells = { A1: '=B1', B1: '=A1', A2: '=SUM(' }
    expect(displayCell('A1', cells)).toBe('#CYCLE!')
    expect(displayCell('A2', cells)).toBe('#ERROR!')
  })

  it('treats empty cells as zero', () => {
    expect(displayCell('B1', {})).toBe('')
    expect(displayCell('B2', { B2: '=A1+1' })).toBe('1')
  })
})
