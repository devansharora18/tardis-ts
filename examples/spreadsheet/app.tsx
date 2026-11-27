import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  pasteClipboard,
  render,
  TextField,
  VirtualList,
  writeClipboard,
  type SceneEvent,
  type SceneNode,
} from '@devansharora18/tardis-ts/scene'
import {
  accents,
  BigCommand,
  Icon,
  OfficeApp,
  Ribbon,
  RibbonGroup,
  SmallCommand,
  office,
  type Accent,
  type IconName,
} from '../shared/office'
import {
  cellRef,
  cellValue,
  columnName,
  displayCell,
  parseRef,
  type Cells,
} from './formula'

const ROWS = 100_000
const ROW_HEIGHT = 27
const CELL_WIDTH = 112
const ROW_HEADER = 46
const HEADER_HEIGHT = 26
const COLUMNS = Array.from({ length: 10 }, (_, index) => columnName(index))
const ACCENT: Accent = accents.excel
const STORAGE_KEY = 'tardis-ts.sheet.workbook.v2'

type NumberFormat = 'general' | 'currency' | 'percent' | 'number'
interface CellFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fill?: string
  color?: string
  align?: 'left' | 'center' | 'right'
  number?: NumberFormat
  decimals?: number
}
type Formats = Record<string, CellFormat>
interface Sheet {
  name: string
  cells: Cells
  formats: Formats
}
interface CellPos {
  row: number
  column: number
}
interface Snapshot {
  sheets: Sheet[]
  activeSheet: number
}
interface RowData {
  cells: Array<string | undefined>
  formats: Array<CellFormat | undefined>
}
interface Range {
  top: number
  left: number
  bottom: number
  right: number
}

const FILL_COLORS = ['#107c41', '#c00000', '#ffc000', '#4472c4', '#7030a0', '#ffffff']

function seedFormats(): Formats {
  const formats: Formats = {}
  for (let column = 0; column < COLUMNS.length; column += 1) {
    formats[cellRef(0, column)] = {
      bold: true,
      fill: ACCENT.main,
      color: '#ffffff',
      align: 'center',
    }
  }
  for (let row = 1; row <= 5; row += 1) {
    for (let column = 3; column <= 5; column += 1) {
      formats[cellRef(row, column)] = { number: 'currency', decimals: 2 }
    }
    formats[cellRef(row, 6)] = { number: 'percent', decimals: 1 }
  }
  formats.G8 = { number: 'percent', decimals: 1, bold: true, fill: ACCENT.tint }
  for (let column = 0; column <= 6; column += 1) {
    formats[cellRef(7, column)] = {
      ...(formats[cellRef(7, column)] ?? {}),
      bold: true,
      fill: ACCENT.tint,
    }
  }
  formats.B8 = { bold: true, fill: ACCENT.tint, number: 'number', decimals: 0 }
  formats.D8 = { bold: true, fill: ACCENT.tint, number: 'currency', decimals: 2 }
  formats.E8 = { bold: true, fill: ACCENT.tint, number: 'currency', decimals: 2 }
  formats.F8 = { bold: true, fill: ACCENT.tint, number: 'currency', decimals: 2 }
  formats.D10 = { number: 'currency', decimals: 2 }
  formats.G10 = { number: 'percent', decimals: 1 }
  const status: Array<[string, string, string]> = [
    ['H2', '#e2f0d9', '#0b5e31'],
    ['H3', '#fff4ce', '#7a4f01'],
    ['H4', '#e2f0d9', '#0b5e31'],
    ['H5', '#fde7e9', '#a4262c'],
    ['H6', '#e2f0d9', '#0b5e31'],
  ]
  for (const [ref, fill, color] of status) {
    formats[ref] = { ...(formats[ref] ?? {}), fill, color, align: 'center' }
  }
  return formats
}

function seedCells(): Cells {
  return {
    A1: 'Item',
    B1: 'Units',
    C1: 'Unit Price',
    D1: 'Revenue',
    E1: 'Cost',
    F1: 'Margin',
    G1: 'Margin %',
    H1: 'Status',
    I1: 'Owner',
    J1: 'Region',
    A2: 'Widget Pro',
    B2: '120',
    C2: '49.5',
    D2: '=B2*C2',
    E2: '=D2*0.62',
    F2: '=D2-E2',
    G2: '=F2/D2',
    H2: 'On track',
    I2: 'Dana',
    J2: 'West',
    A3: 'Widget Air',
    B3: '86',
    C3: '39',
    D3: '=B3*C3',
    E3: '=D3*0.62',
    F3: '=D3-E3',
    G3: '=F3/D3',
    H3: 'At risk',
    I3: 'Miles',
    J3: 'East',
    A4: 'Widget Mini',
    B4: '214',
    C4: '24.75',
    D4: '=B4*C4',
    E4: '=D4*0.62',
    F4: '=D4-E4',
    G4: '=F4/D4',
    H4: 'On track',
    I4: 'Rae',
    J4: 'West',
    A5: 'Widget Max',
    B5: '54',
    C5: '89',
    D5: '=B5*C5',
    E5: '=D5*0.62',
    F5: '=D5-E5',
    G5: '=F5/D5',
    H5: 'Behind',
    I5: 'Noah',
    J5: 'Central',
    A6: 'Services',
    B6: '32',
    C6: '150',
    D6: '=B6*C6',
    E6: '=D6*0.62',
    F6: '=D6-E6',
    G6: '=F6/D6',
    H6: 'On track',
    I6: 'Iris',
    J6: 'East',
    A8: 'Total',
    B8: '=SUM(B2:B6)',
    D8: '=SUM(D2:D6)',
    E8: '=SUM(E2:E6)',
    F8: '=SUM(F2:F6)',
    G8: '=F8/D8',
    A10: 'Q1 target',
    D10: '=D8*1.18',
    G10: '=G8+0.02',
    A12: 'Notes',
    A13: 'Unit price held flat through Q1. Services margin assumes 62% delivery cost.',
  }
}

function seedSheets(): Sheet[] {
  return [
    { name: 'Q4 Budget', cells: seedCells(), formats: seedFormats() },
    {
      name: 'Assumptions',
      cells: {
        A1: 'Driver',
        B1: 'Value',
        C1: 'Notes',
        A2: 'Unit growth',
        B2: '0.12',
        C2: 'Applied to Q1 plan',
        A3: 'Price growth',
        B3: '0.03',
        C3: 'Held flat on services',
        A4: 'Delivery cost',
        B4: '0.62',
        C4: 'Share of revenue',
        A5: 'Target margin',
        B5: '0.32',
        C5: 'Board commitment',
      },
      formats: {
        A1: { bold: true, fill: ACCENT.main, color: '#ffffff' },
        B1: { bold: true, fill: ACCENT.main, color: '#ffffff' },
        C1: { bold: true, fill: ACCENT.main, color: '#ffffff' },
        B2: { number: 'percent', decimals: 0 },
        B3: { number: 'percent', decimals: 0 },
        B4: { number: 'percent', decimals: 0 },
        B5: { number: 'percent', decimals: 0 },
      },
    },
  ]
}

function loadWorkbook(): Sheet[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { sheets?: Sheet[] }
    if (!Array.isArray(parsed.sheets) || parsed.sheets.length === 0) return null
    const sheets = parsed.sheets.filter(
      (sheet) =>
        sheet &&
        typeof sheet.name === 'string' &&
        sheet.cells &&
        typeof sheet.cells === 'object' &&
        sheet.formats &&
        typeof sheet.formats === 'object'
    )
    return sheets.length > 0 ? sheets : null
  } catch {
    return null
  }
}

const [sheets, setSheets] = createSignal<Sheet[]>(loadWorkbook() ?? seedSheets())
const [activeSheet, setActiveSheet] = createSignal(0)
const [anchorCell, setAnchorCell] = createSignal<CellPos>({ row: 0, column: 0 })
const [focusCell, setFocusCell] = createSignal<CellPos>({ row: 0, column: 0 })
const [draft, setDraft] = createSignal(seedCells().A1 ?? '')
const [status, setStatus] = createSignal('Ready')
const [scrollTop, setScrollTop] = createSignal(0)
const [tab, setTab] = createSignal('home')
const [showFormulas, setShowFormulas] = createSignal(false)
const [showGridlines, setShowGridlines] = createSignal(true)
const [showHeadings, setShowHeadings] = createSignal(true)
const [showFormulaBar, setShowFormulaBar] = createSignal(true)
const [dragging, setDragging] = createSignal(false)
const [viewportW, setViewportW] = createSignal(
  typeof window !== 'undefined' ? window.innerWidth : 1280
)
const [viewportH, setViewportH] = createSignal(
  typeof window !== 'undefined' ? window.innerHeight : 800
)

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    setViewportW(window.innerWidth)
    setViewportH(window.innerHeight)
  })
}

const rows = Array.from({ length: ROWS }, (_, index) => index)
const undoStack: Snapshot[] = []
const redoStack: Snapshot[] = []

function sheet(): Sheet {
  return sheets()[activeSheet()] ?? sheets()[0]!
}

function cells(): Cells {
  return sheet().cells
}

function formats(): Formats {
  return sheet().formats
}

function gridHeight(): number {
  return Math.max(300, viewportH() - 245)
}

function formulaWidth(): number {
  return Math.max(280, viewportW() - 300)
}

function activeRef(): string {
  return cellRef(anchorCell().row, anchorCell().column)
}

function clampCell(row: number, column: number): CellPos {
  return {
    row: Math.min(Math.max(0, row), ROWS - 1),
    column: Math.min(Math.max(0, column), COLUMNS.length - 1),
  }
}

function range(): Range {
  const a = anchorCell()
  const f = focusCell()
  return {
    top: Math.min(a.row, f.row),
    left: Math.min(a.column, f.column),
    bottom: Math.max(a.row, f.row),
    right: Math.max(a.column, f.column),
  }
}

function rangeLabel(): string {
  const r = range()
  const start = cellRef(r.top, r.left)
  const end = cellRef(r.bottom, r.right)
  return start === end ? start : `${start}:${end}`
}

function usedBounds(): Range {
  let bottom = 0
  let right = 0
  for (const ref of Object.keys(cells())) {
    const parsed = parseRef(ref)
    if (!parsed) continue
    bottom = Math.max(bottom, parsed.row)
    right = Math.max(right, parsed.column)
  }
  for (const ref of Object.keys(formats())) {
    const parsed = parseRef(ref)
    if (!parsed) continue
    bottom = Math.max(bottom, parsed.row)
    right = Math.max(right, parsed.column)
  }
  return { top: 0, left: 0, bottom, right }
}

function updateActive(update: (entry: Sheet) => Sheet): void {
  setSheets((list) =>
    list.map((entry, index) => (index === activeSheet() ? update(entry) : entry))
  )
}

function snapshot(): void {
  undoStack.push(JSON.parse(JSON.stringify({ sheets: sheets(), activeSheet: activeSheet() })) as Snapshot)
  if (undoStack.length > 40) undoStack.shift()
  redoStack.length = 0
}

function restore(state: Snapshot): void {
  setSheets(state.sheets)
  const index = Math.min(state.activeSheet, state.sheets.length - 1)
  setActiveSheet(index)
  setAnchorCell({ row: 0, column: 0 })
  setFocusCell({ row: 0, column: 0 })
  setDraft(state.sheets[index]?.cells.A1 ?? '')
  setScrollTop(0)
}

function undo(): void {
  const previous = undoStack.pop()
  if (!previous) {
    setStatus('Nothing to undo')
    return
  }
  redoStack.push(
    JSON.parse(JSON.stringify({ sheets: sheets(), activeSheet: activeSheet() })) as Snapshot
  )
  restore(previous)
  setStatus('Undo')
}

function redo(): void {
  const next = redoStack.pop()
  if (!next) {
    setStatus('Nothing to redo')
    return
  }
  undoStack.push(
    JSON.parse(JSON.stringify({ sheets: sheets(), activeSheet: activeSheet() })) as Snapshot
  )
  restore(next)
  setStatus('Redo')
}

function selectCell(row: number, column: number, extend = false): void {
  const next = clampCell(row, column)
  if (!extend) setAnchorCell(next)
  setFocusCell(next)
  const base = extend ? anchorCell() : next
  setDraft(cells()[cellRef(base.row, base.column)] ?? '')
}

function selectColumn(column: number): void {
  const used = usedBounds()
  setAnchorCell({ row: 0, column })
  setFocusCell({ row: Math.max(0, used.bottom), column })
  setDraft(cells()[cellRef(0, column)] ?? '')
  setStatus(`Column ${columnName(column)} selected`)
}

function selectRow(row: number): void {
  setAnchorCell({ row, column: 0 })
  setFocusCell({ row, column: COLUMNS.length - 1 })
  setDraft(cells()[cellRef(row, 0)] ?? '')
  setStatus(`Row ${row + 1} selected`)
}

function selectAll(): void {
  const used = usedBounds()
  setAnchorCell({ row: 0, column: 0 })
  setFocusCell({ row: Math.max(1, used.bottom), column: Math.max(1, used.right) })
  setDraft(cells().A1 ?? '')
  setStatus('Used range selected')
}

function commit(move: 'down' | 'up' | 'right' | 'left' | null = null): void {
  const position = anchorCell()
  const ref = cellRef(position.row, position.column)
  const value = draft()
  const previous = cells()[ref] ?? ''
  if (value !== previous) {
    snapshot()
    updateActive((entry) => {
      const next = { ...entry.cells }
      if (value === '') delete next[ref]
      else next[ref] = value
      return { ...entry, cells: next }
    })
    setStatus(`${ref} saved`)
  }
  if (move === 'down') selectCell(position.row + 1, position.column)
  if (move === 'up') selectCell(position.row - 1, position.column)
  if (move === 'right') selectCell(position.row, position.column + 1)
  if (move === 'left') selectCell(position.row, position.column - 1)
}

function clearRange(): void {
  const r = range()
  snapshot()
  updateActive((entry) => {
    const nextCells = { ...entry.cells }
    const nextFormats = { ...entry.formats }
    for (const ref of Object.keys(nextCells)) {
      const parsed = parseRef(ref)
      if (!parsed) continue
      if (
        parsed.row >= r.top &&
        parsed.row <= r.bottom &&
        parsed.column >= r.left &&
        parsed.column <= r.right
      ) {
        delete nextCells[ref]
      }
    }
    for (const ref of Object.keys(nextFormats)) {
      const parsed = parseRef(ref)
      if (!parsed) continue
      if (
        parsed.row >= r.top &&
        parsed.row <= r.bottom &&
        parsed.column >= r.left &&
        parsed.column <= r.right
      ) {
        delete nextFormats[ref]
      }
    }
    return { ...entry, cells: nextCells, formats: nextFormats }
  })
  setDraft('')
  setStatus(`Cleared ${rangeLabel()}`)
}

function applyFormat(patch: Partial<CellFormat>): void {
  const r = range()
  const area = (r.bottom - r.top + 1) * (r.right - r.left + 1)
  if (area > 5000) {
    setStatus('Select fewer than 5,000 cells to format')
    return
  }
  snapshot()
  updateActive((entry) => {
    const next = { ...entry.formats }
    for (let row = r.top; row <= r.bottom; row += 1) {
      for (let column = r.left; column <= r.right; column += 1) {
        const ref = cellRef(row, column)
        next[ref] = { ...next[ref], ...patch }
      }
    }
    return { ...entry, formats: next }
  })
  setStatus(`Formatted ${rangeLabel()}`)
}

function activeFormat(): CellFormat {
  return formats()[activeRef()] ?? {}
}

function toggleBold(): void {
  applyFormat({ bold: !activeFormat().bold })
}

function toggleItalic(): void {
  applyFormat({ italic: !activeFormat().italic })
}

function toggleUnderline(): void {
  applyFormat({ underline: !activeFormat().underline })
}

function align(value: 'left' | 'center' | 'right'): void {
  applyFormat({ align: value })
}

function setNumber(number: NumberFormat, decimals?: number): void {
  applyFormat({
    number,
    decimals: decimals ?? (number === 'currency' ? 2 : number === 'percent' ? 1 : 0),
  })
}

function changeDecimals(delta: number): void {
  const current = activeFormat()
  const fallback = current.number === 'currency' ? 2 : current.number === 'percent' ? 1 : 0
  const next = Math.min(6, Math.max(0, (current.decimals ?? fallback) + delta))
  applyFormat({ decimals: next })
}

function applyHeaderStyle(): void {
  applyFormat({ bold: true, fill: ACCENT.main, color: '#ffffff', align: 'center' })
}

function applyTotalStyle(): void {
  applyFormat({ bold: true, fill: ACCENT.tint })
}

function copyRange(): void {
  const r = range()
  if ((r.bottom - r.top + 1) * (r.right - r.left + 1) > 5000) {
    setStatus('Selection is too large to copy')
    return
  }
  const lines: string[] = []
  for (let row = r.top; row <= r.bottom; row += 1) {
    const values: string[] = []
    for (let column = r.left; column <= r.right; column += 1) {
      values.push(cells()[cellRef(row, column)] ?? '')
    }
    lines.push(values.join('\t'))
  }
  writeClipboard(lines.join('\n'))
  setStatus(`Copied ${rangeLabel()}`)
}

function cutRange(): void {
  copyRange()
  clearRange()
  setStatus(`Cut ${rangeLabel()}`)
}

function pasteRange(): void {
  pasteClipboard((text) => {
    const lines = text.replace(/\r/g, '').split('\n')
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
      setStatus('Clipboard is empty')
      return
    }
    snapshot()
    const start = anchorCell()
    updateActive((entry) => {
      const next = { ...entry.cells }
      lines.slice(0, 1000).forEach((line, rowOffset) => {
        line.split('\t').forEach((value, columnOffset) => {
          const row = start.row + rowOffset
          const column = start.column + columnOffset
          if (row >= ROWS || column >= COLUMNS.length) return
          const ref = cellRef(row, column)
          if (value === '') delete next[ref]
          else next[ref] = value
        })
      })
      return { ...entry, cells: next }
    })
    setStatus(`Pasted ${Math.min(lines.length, 1000)} row(s)`)
  })
}

function stats(): { sum: number; count: number; numeric: number } | null {
  const r = range()
  if ((r.bottom - r.top + 1) * (r.right - r.left + 1) > 5000) return null
  let sum = 0
  let count = 0
  let numeric = 0
  for (let row = r.top; row <= r.bottom; row += 1) {
    for (let column = r.left; column <= r.right; column += 1) {
      const raw = cells()[cellRef(row, column)] ?? ''
      if (raw !== '') count += 1
      const value = cellValue(cellRef(row, column), cells())
      if (value !== null) {
        sum += value
        numeric += 1
      }
    }
  }
  return { sum, count, numeric }
}

function statsText(): string {
  const value = stats()
  if (!value || value.numeric === 0) return ''
  const average = value.sum / value.numeric
  return `Average: ${round(average)}   Count: ${value.numeric}   Sum: ${round(value.sum)}`
}

function round(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function groupNumber(value: number, decimals: number): string {
  const fixed = Math.abs(value).toFixed(decimals)
  const [whole, fraction] = fixed.split('.')
  const grouped = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${value < 0 ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`
}

function formattedText(ref: string): string {
  const raw = cells()[ref] ?? ''
  if (showFormulas() && raw.startsWith('=')) return raw
  const text = displayCell(ref, cells())
  const format = formats()[ref] ?? {}
  if (text.startsWith('#')) return text
  const value = Number(text)
  if (text.trim() === '' || !Number.isFinite(value)) return text
  const decimals =
    format.decimals ??
    (format.number === 'currency' ? 2 : format.number === 'percent' ? 1 : 0)
  if (format.number === 'currency') return `$${groupNumber(value, decimals)}`
  if (format.number === 'percent') return `${groupNumber(value * 100, decimals)}%`
  if (format.number === 'number') return groupNumber(value, decimals)
  return text
}

function underline(text: string): string {
  return [...text].map((char) => `${char}\u0332`).join('')
}

function isNumericText(text: string): boolean {
  return text.trim() !== '' && Number.isFinite(Number(text.replace(/[$,%]/g, '')))
}

function aggregate(
  fn: 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT'
): void {
  const r = range()
  let target: CellPos
  let from: CellPos
  let to: CellPos
  if (r.top !== r.bottom || r.left !== r.right) {
    target = { row: r.bottom + 1, column: r.left }
    from = { row: r.top, column: r.left }
    to = { row: r.bottom, column: r.right }
  } else {
    let row = r.top - 1
    while (row >= 0 && cellValue(cellRef(row, r.left), cells()) !== null) row -= 1
    if (row === r.top - 1) {
      setStatus('Select a range of numbers first')
      return
    }
    target = { row: r.top, column: r.left }
    from = { row: row + 1, column: r.left }
    to = { row: r.top - 1, column: r.left }
  }
  if (target.row >= ROWS) {
    setStatus('No room below the selection')
    return
  }
  const formula = `=${fn}(${cellRef(from.row, from.column)}:${cellRef(to.row, to.column)})`
  snapshot()
  updateActive((entry) => ({
    ...entry,
    cells: { ...entry.cells, [cellRef(target.row, target.column)]: formula },
  }))
  setAnchorCell(target)
  setFocusCell(target)
  setDraft(formula)
  setStatus(`${fn} inserted at ${cellRef(target.row, target.column)}`)
}

function rowKey(row: number, keyColumn: number, source: Cells): { text: string; number: number | null } {
  const text = displayCell(cellRef(row, keyColumn), source)
  const number = Number(text)
  return { text, number: Number.isFinite(number) ? number : null }
}

function sortRange(direction: 1 | -1): void {
  let r = range()
  if (r.top === r.bottom && r.left === r.right) {
    const used = usedBounds()
    r = { top: 0, left: 0, bottom: used.bottom, right: used.right }
  }
  if (r.bottom <= r.top) {
    setStatus('Not enough rows to sort')
    return
  }
  const keyColumn =
    anchorCell().column >= r.left && anchorCell().column <= r.right
      ? anchorCell().column
      : r.left
  const header = r.top === 0 ? 1 : 0
  if (r.bottom - r.top < header + 1) {
    setStatus('Not enough rows to sort')
    return
  }
  snapshot()
  const source = cells()
  const data: Array<{ key: { text: string; number: number | null }; data: RowData }> = []
  for (let row = r.top + header; row <= r.bottom; row += 1) {
    const rowCells: Array<string | undefined> = []
    const rowFormats: Array<CellFormat | undefined> = []
    for (let column = r.left; column <= r.right; column += 1) {
      const ref = cellRef(row, column)
      rowCells.push(source[ref])
      rowFormats.push(formats()[ref])
    }
    data.push({
      key: rowKey(row, keyColumn, source),
      data: { cells: rowCells, formats: rowFormats },
    })
  }
  data.sort((a, b) => {
    if (a.key.number !== null && b.key.number !== null) {
      return (a.key.number - b.key.number) * direction
    }
    return a.key.text.localeCompare(b.key.text) * direction
  })
  updateActive((entry) => {
    const nextCells = { ...entry.cells }
    const nextFormats = { ...entry.formats }
    for (let row = r.top + header; row <= r.bottom; row += 1) {
      for (let column = r.left; column <= r.right; column += 1) {
        const ref = cellRef(row, column)
        delete nextCells[ref]
        delete nextFormats[ref]
      }
    }
    data.forEach((rowEntry, rowOffset) => {
      const row = r.top + header + rowOffset
      for (let column = r.left; column <= r.right; column += 1) {
        const ref = cellRef(row, column)
        const value = rowEntry.data.cells[column - r.left]
        const format = rowEntry.data.formats[column - r.left]
        if (value !== undefined) nextCells[ref] = value
        if (format) nextFormats[ref] = format
      }
    })
    return { ...entry, cells: nextCells, formats: nextFormats }
  })
  setStatus(`Sorted ${rangeLabel()} ${direction === 1 ? 'A to Z' : 'Z to A'}`)
}

function removeDuplicates(): void {
  const base = usedBounds()
  const selected = range()
  const r =
    selected.top !== selected.bottom || selected.left !== selected.right
      ? selected
      : base
  const header = r.top === 0 ? 1 : 0
  const source = cells()
  const seen = new Set<string>()
  const keep: Array<{ row: number; data: RowData }> = []
  let removed = 0
  for (let row = r.top + header; row <= r.bottom; row += 1) {
    const data: RowData = { cells: [], formats: [] }
    for (let column = r.left; column <= r.right; column += 1) {
      const ref = cellRef(row, column)
      data.cells.push(source[ref])
      data.formats.push(formats()[ref])
    }
    const signature = data.cells.map((value) => value ?? '').join('\u0001')
    if (seen.has(signature)) {
      removed += 1
    } else {
      seen.add(signature)
      keep.push({ row, data })
    }
  }
  if (removed === 0) {
    setStatus('No duplicate rows found')
    return
  }
  snapshot()
  updateActive((entry) => {
    const nextCells = { ...entry.cells }
    const nextFormats = { ...entry.formats }
    for (let row = r.top + header; row <= r.bottom; row += 1) {
      for (let column = r.left; column <= r.right; column += 1) {
        const ref = cellRef(row, column)
        delete nextCells[ref]
        delete nextFormats[ref]
      }
    }
    keep.forEach((entryRow, offset) => {
      const row = r.top + header + offset
      for (let column = r.left; column <= r.right; column += 1) {
        const ref = cellRef(row, column)
        const value = entryRow.data.cells[column - r.left]
        const format = entryRow.data.formats[column - r.left]
        if (value !== undefined) nextCells[ref] = value
        if (format) nextFormats[ref] = format
      }
    })
    return { ...entry, cells: nextCells, formats: nextFormats }
  })
  setStatus(`Removed ${removed} duplicate row(s)`)
}

function addSheet(): void {
  snapshot()
  const name = `Sheet${sheets().length + 1}`
  const next = [...sheets(), { name, cells: {}, formats: {} }]
  setSheets(next)
  setActiveSheet(next.length - 1)
  setAnchorCell({ row: 0, column: 0 })
  setFocusCell({ row: 0, column: 0 })
  setDraft('')
  setScrollTop(0)
  setStatus(`Added ${name}`)
}

function deleteSheet(): void {
  if (sheets().length === 1) {
    setStatus('A workbook needs at least one sheet')
    return
  }
  snapshot()
  const index = activeSheet()
  const next = sheets().filter((_, position) => position !== index)
  setSheets(next)
  const target = Math.max(0, index - 1)
  setActiveSheet(target)
  setAnchorCell({ row: 0, column: 0 })
  setFocusCell({ row: 0, column: 0 })
  setDraft(next[target]?.cells.A1 ?? '')
  setStatus('Sheet deleted')
}

function switchSheet(index: number): void {
  if (index < 0 || index >= sheets().length) return
  setActiveSheet(index)
  setAnchorCell({ row: 0, column: 0 })
  setFocusCell({ row: 0, column: 0 })
  setDraft(sheets()[index]?.cells.A1 ?? '')
  setScrollTop(0)
  setStatus(`Switched to ${sheets()[index]?.name ?? 'sheet'}`)
}

function saveWorkbook(): void {
  try {
    if (typeof localStorage === 'undefined') throw new Error('no storage')
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, sheets: sheets(), activeSheet: activeSheet() })
    )
    setStatus('Workbook saved to this device')
  } catch {
    setStatus('Save is unavailable in this host')
  }
}

function openWorkbook(): void {
  const saved = loadWorkbook()
  if (!saved) {
    setStatus('No saved workbook found')
    return
  }
  snapshot()
  setSheets(saved)
  setActiveSheet(0)
  setAnchorCell({ row: 0, column: 0 })
  setFocusCell({ row: 0, column: 0 })
  setDraft(saved[0]?.cells.A1 ?? '')
  setScrollTop(0)
  setStatus('Workbook opened')
}

function newWorkbook(): void {
  snapshot()
  setSheets([{ name: 'Sheet1', cells: {}, formats: {} }])
  setActiveSheet(0)
  setAnchorCell({ row: 0, column: 0 })
  setFocusCell({ row: 0, column: 0 })
  setDraft('')
  setScrollTop(0)
  setTab('home')
  setStatus('New workbook — Undo restores the previous one')
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function workbookCsv(): string {
  const used = usedBounds()
  const lines: string[] = []
  for (let row = 0; row <= used.bottom; row += 1) {
    const values: string[] = []
    for (let column = 0; column <= used.right; column += 1) {
      values.push(csvEscape(formattedText(cellRef(row, column))))
    }
    lines.push(values.join(','))
  }
  return lines.join('\n')
}

function exportCsv(): void {
  const csv = workbookCsv()
  writeClipboard(csv)
  if (typeof document !== 'undefined') {
    const anchor = document.createElement('a')
    anchor.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    anchor.download = `${sheet().name.replace(/\s+/g, '-').toLowerCase()}.csv`
    anchor.click()
  }
  setStatus('Exported CSV')
}

function printWorkbook(): void {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
    setStatus('Print dialog opened')
  } else {
    setStatus('Printing is available on the web build')
  }
}

function copySummary(): void {
  const value = stats()
  const summary = [
    `Tardis Sheet — ${sheet().name}`,
    `${ROWS.toLocaleString()} rows × ${COLUMNS.length} columns`,
    `Selection: ${rangeLabel()}`,
    value ? `Sum: ${round(value.sum)}  Average: ${round(value.sum / Math.max(1, value.numeric))}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  writeClipboard(summary)
  setStatus('Summary copied')
}

function onGridKey(event: SceneEvent): void {
  const position = anchorCell()
  const mods = event.mods ?? { ctrl: false, shift: false, alt: false, meta: false }
  const command = mods.ctrl || mods.meta
  const key = event.key ?? ''
  if (command) {
    if (key.toLowerCase() === 'z') {
      event.preventDefault?.()
      undo()
      return
    }
    if (key.toLowerCase() === 'y') {
      event.preventDefault?.()
      redo()
      return
    }
    if (key.toLowerCase() === 'c') {
      event.preventDefault?.()
      copyRange()
      return
    }
    if (key.toLowerCase() === 'x') {
      event.preventDefault?.()
      cutRange()
      return
    }
    if (key.toLowerCase() === 'v') {
      event.preventDefault?.()
      pasteRange()
      return
    }
    if (key.toLowerCase() === 'a') {
      event.preventDefault?.()
      selectAll()
      return
    }
  }
  if (mods.shift && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    event.preventDefault?.()
    if (key === 'ArrowUp') selectCell(position.row - 1, position.column, true)
    if (key === 'ArrowDown') selectCell(position.row + 1, position.column, true)
    if (key === 'ArrowLeft') selectCell(position.row, position.column - 1, true)
    if (key === 'ArrowRight') selectCell(position.row, position.column + 1, true)
    return
  }
  switch (key) {
    case 'ArrowUp':
      event.preventDefault?.()
      selectCell(position.row - 1, position.column)
      return
    case 'ArrowDown':
      event.preventDefault?.()
      selectCell(position.row + 1, position.column)
      return
    case 'ArrowLeft':
      event.preventDefault?.()
      selectCell(position.row, position.column - 1)
      return
    case 'ArrowRight':
      event.preventDefault?.()
      selectCell(position.row, position.column + 1)
      return
    case 'PageUp':
      event.preventDefault?.()
      selectCell(position.row - 20, position.column)
      return
    case 'PageDown':
      event.preventDefault?.()
      selectCell(position.row + 20, position.column)
      return
    case 'Home':
      event.preventDefault?.()
      selectCell(position.row, 0)
      return
    case 'End':
      event.preventDefault?.()
      selectCell(position.row, COLUMNS.length - 1)
      return
    case 'Tab':
      event.preventDefault?.()
      selectCell(position.row, position.column + (mods.shift ? -1 : 1))
      return
    case 'Enter':
      event.preventDefault?.()
      commit(mods.shift ? 'up' : 'down')
      return
    case 'Escape':
      setDraft(cells()[activeRef()] ?? '')
      setStatus('Ready')
      return
    case 'Delete':
    case 'Backspace':
      event.preventDefault?.()
      clearRange()
      return
    default:
      break
  }
  if (key.length === 1 && !mods.alt && !command) {
    setDraft(key)
    setStatus(`Editing ${activeRef()} — press Enter to apply`)
  }
}

function Cell(props: { row: number; column: number }): SceneNode {
  const ref = cellRef(props.row, props.column)
  const active = (): boolean =>
    anchorCell().row === props.row && anchorCell().column === props.column
  const inRange = (): boolean => {
    const r = range()
    return (
      props.row >= r.top &&
      props.row <= r.bottom &&
      props.column >= r.left &&
      props.column <= r.right
    )
  }
  const format = (): CellFormat => formats()[ref] ?? {}
  const numeric = (): boolean => isNumericText(displayCell(ref, cells()))
  const align = (): 'left' | 'center' | 'right' =>
    format().align ?? (numeric() ? 'right' : 'left')
  return jsx(
    'div',
    {
      role: 'gridcell',
      onPointerDown: (event: SceneEvent) => {
        setDragging(true)
        selectCell(props.row, props.column, event.mods?.shift ?? false)
      },
      onPointerMove: () => {
        if (dragging()) selectCell(props.row, props.column, true)
      },
      onPointerUp: () => setDragging(false),
      style: () => {
        const f = format()
        const selected = inRange()
        return {
          width: CELL_WIDTH,
          height: ROW_HEIGHT,
          paddingLeft: 6,
          paddingRight: 6,
          alignItems: 'center',
          justifyContent:
            align() === 'right' ? 'flex-end' : align() === 'center' ? 'center' : 'flex-start',
          overflow: 'hidden',
          borderWidth: active() ? 2 : 1,
          borderColor: active() ? ACCENT.main : showGridlines() ? office.borderSoft : office.surface,
          backgroundColor: selected ? f.fill ?? ACCENT.soft : f.fill ?? office.surface,
        }
      },
    },
    jsx(
      'span',
      {
        style: () => {
          const f = format()
          return {
            color: f.color ?? office.ink,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: f.bold ? 600 : 400,
            fontStyle: f.italic ? 'italic' : 'normal',
            whiteSpace: 'nowrap',
          }
        },
      },
      dynamic(() => {
        const value = formattedText(ref)
        return format().underline ? underline(value) : value
      })
    )
  )
}

function GridHeader(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        height: HEADER_HEIGHT,
        minHeight: HEADER_HEIGHT,
        flexDirection: 'row',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        'aria-label': 'Select used range',
        onClick: selectAll,
        style: {
          width: ROW_HEADER,
          height: HEADER_HEIGHT,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 5,
          borderColor: office.borderSoft,
          borderWidth: 1,
        },
      },
      jsx('span', { style: { color: office.dim, fontSize: 8 } }, '◢')
    ),
    ...COLUMNS.map((column, index) =>
      jsx(
        'div',
        {
          key: column,
          role: 'button',
          tabIndex: 0,
          'aria-label': `Select column ${column}`,
          onClick: () => selectColumn(index),
          style: () => ({
            width: CELL_WIDTH,
            height: HEADER_HEIGHT,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: office.borderSoft,
            borderWidth: 1,
            backgroundColor:
              anchorCell().column === index ? ACCENT.tint : office.chrome,
          }),
        },
        jsx(
          'span',
          {
            style: () => ({
              fontSize: 10.5,
              color: anchorCell().column === index ? ACCENT.dark : office.muted,
              fontWeight: anchorCell().column === index ? 600 : 400,
            }),
          },
          column
        )
      )
    )
  )
}

function Grid(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        flexDirection: 'column',
        minHeight: 0,
        backgroundColor: office.surface,
        borderColor: office.border,
        borderWidth: 1,
        marginLeft: 6,
        marginRight: 6,
        marginBottom: 2,
      },
    },
    showHeadings() ? jsx(GridHeader, {}) : null,
    jsx(
      'div',
      {
        style: {
          flexGrow: 1,
          minHeight: 0,
          position: 'relative',
          backgroundColor: office.surface,
        },
        onPointerUp: () => setDragging(false),
        onKeyDown: onGridKey,
        tabIndex: 0,
      },
      jsx(VirtualList, {
        items: rows,
        rowHeight: ROW_HEIGHT,
        height: gridHeight(),
        overscan: 3,
        scrollTop: () => scrollTop(),
        onScroll: setScrollTop,
        renderRow: (row: number) =>
          jsx(
            'div',
            {
              key: row,
              style: {
                height: ROW_HEIGHT,
                flexDirection: 'row',
                backgroundColor: office.surface,
              },
            },
            showHeadings()
              ? jsx(
                  'div',
                  {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `Select row ${row + 1}`,
                    onClick: () => selectRow(row),
                    style: () => ({
                      width: ROW_HEADER,
                      height: ROW_HEIGHT,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: office.borderSoft,
                      borderWidth: 1,
                      backgroundColor:
                        anchorCell().row === row ? ACCENT.tint : office.chrome,
                    }),
                  },
                  jsx(
                    'span',
                    {
                      style: () => ({
                        fontSize: 10,
                        color: anchorCell().row === row ? ACCENT.dark : office.dim,
                      }),
                    },
                    String(row + 1)
                  )
                )
              : null,
            ...COLUMNS.map((_, column) =>
              jsx(Cell, { key: column, row, column })
            )
          ),
      }),
      selectionBars()
    )
  )
}

function selectionBars(): ReturnType<typeof dynamic> {
  return dynamic(() => {
    const r = range()
    const top = r.top * ROW_HEIGHT - scrollTop()
    const left = (showHeadings() ? ROW_HEADER : 0) + r.left * CELL_WIDTH
    const width = (r.right - r.left + 1) * CELL_WIDTH
    const height = (r.bottom - r.top + 1) * ROW_HEIGHT
    if (top + height < 0 || top > gridHeight()) return []
    const bar = (key: string, style: Record<string, unknown>): SceneNode =>
      jsx('div', {
        key,
        style: {
          position: 'absolute',
          backgroundColor: ACCENT.main,
          ...style,
        },
      })
    return [
      bar('top', { left, top, width, height: 2 }),
      bar('bottom', { left, top: top + height - 2, width, height: 2 }),
      bar('left', { left, top, width: 2, height }),
      bar('right', { left: left + width - 2, top, width: 2, height }),
      jsx('div', {
        key: 'handle',
        style: {
          position: 'absolute',
          left: left + width - 4,
          top: top + height - 4,
          width: 7,
          height: 7,
          backgroundColor: ACCENT.main,
          borderWidth: 1,
          borderColor: office.surface,
        },
      }),
    ]
  })
}

function FormulaBar(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        height: 35,
        minHeight: 35,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 6,
        paddingRight: 6,
        backgroundColor: office.surface,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      {
        style: {
          width: 96,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: office.border,
          backgroundColor: office.surface,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 11, color: office.ink } },
        dynamic(() => rangeLabel())
      )
    ),
    jsx(
      'div',
      {
        style: {
          width: 26,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: office.border,
          backgroundColor: office.chrome,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 12, fontFamily: 'serif', fontStyle: 'italic', color: office.muted } },
        'fx'
      )
    ),
    jsx(TextField, {
      value: () => draft(),
      onChange: setDraft,
      onSubmit: () => commit('down'),
      ariaLabel: 'Formula bar',
      width: formulaWidth(),
      height: 24,
      padding: 3,
      lineHeight: 18,
      fontSize: 12,
      backgroundColor: office.surface,
      color: office.ink,
      placeholderColor: office.dim,
      selectionColor: ACCENT.soft,
      caretColor: ACCENT.main,
      borderWidth: 1,
      borderColor: office.border,
      borderRadius: 0,
      placeholder: 'Value or =SUM(A1:A10)',
      onKeyDown: (event: SceneEvent) => {
        if (event.key === 'Escape') {
          setDraft(cells()[activeRef()] ?? '')
          setStatus('Ready')
        }
      },
    }),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'span',
      { style: { fontSize: 10, color: office.dim } },
      dynamic(() => (showFormulas() ? 'Showing formulas' : ''))
    )
  )
}

function SheetTabs(): SceneNode {
  return jsx(
    'div',
    {
      style: {
        height: 28,
        minHeight: 28,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingLeft: 6,
        paddingRight: 8,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        'aria-label': 'Previous sheet',
        onClick: () => switchSheet(activeSheet() - 1),
        style: {
          width: 20,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      jsx('span', { style: { fontSize: 11, color: office.muted } }, '‹')
    ),
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        'aria-label': 'Next sheet',
        onClick: () => switchSheet(activeSheet() + 1),
        style: {
          width: 20,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      jsx('span', { style: { fontSize: 11, color: office.muted } }, '›')
    ),
    dynamic(() =>
      jsx(
        'div',
        { style: { flexDirection: 'row', alignItems: 'center', gap: 2, flexGrow: 1 } },
        ...sheets().map((entry, index) =>
          jsx(
            'div',
            {
              key: entry.name,
              role: 'tab',
              tabIndex: 0,
              'aria-selected': index === activeSheet() ? 'true' : 'false',
              onClick: () => switchSheet(index),
              style: {
                height: 24,
                paddingLeft: 12,
                paddingRight: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: index === activeSheet() ? office.surface : 'transparent',
                borderColor: index === activeSheet() ? ACCENT.main : 'transparent',
                borderWidth: 1,
              },
            },
            jsx(
              'span',
              {
                style: {
                  fontSize: 11,
                  color: index === activeSheet() ? ACCENT.main : office.muted,
                  fontWeight: index === activeSheet() ? 600 : 400,
                },
              },
              entry.name
            )
          )
        ),
        jsx(
          'div',
          {
            role: 'button',
            tabIndex: 0,
            'aria-label': 'Add sheet',
            onClick: addSheet,
            style: {
              width: 24,
              height: 22,
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          jsx('span', { style: { fontSize: 14, color: ACCENT.main } }, '+')
        )
      )
    )
  )
}

function fillSwatches(): SceneNode {
  return jsx(
    'div',
    { style: { flexDirection: 'row', gap: 2, alignItems: 'center' } },
    ...FILL_COLORS.map((color) =>
      jsx('div', {
        key: color,
        role: 'button',
        tabIndex: 0,
        'aria-label': `Fill ${color}`,
        onClick: () => applyFormat({ fill: color }),
        style: {
          width: 14,
          height: 14,
          backgroundColor: color,
          borderWidth: 1,
          borderColor: color === '#ffffff' ? office.border : color,
          borderRadius: 2,
        },
      })
    ),
    jsx(
      'div',
      {
        role: 'button',
        tabIndex: 0,
        'aria-label': 'No fill',
        onClick: () => applyFormat({ fill: undefined }),
        style: {
          width: 16,
          height: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: office.surface,
          borderWidth: 1,
          borderColor: office.border,
          borderRadius: 2,
        },
      },
      jsx('span', { style: { fontSize: 10, color: office.danger, lineHeight: 10 } }, '×')
    )
  )
}

function homeRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Clipboard',
        children: [
          jsx(BigCommand, {
            icon: 'paste',
            label: 'Paste',
            onClick: pasteRange,
            accent: ACCENT,
          }),
          jsx(
            'div',
            { style: { flexDirection: 'column', gap: 1 } },
            jsx(SmallCommand, {
              icon: 'cut',
              label: 'Cut',
              onClick: cutRange,
              accent: ACCENT,
            }),
            jsx(SmallCommand, {
              icon: 'copy',
              label: 'Copy',
              onClick: copyRange,
              accent: ACCENT,
            })
          ),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Font',
        children: [
          jsx(
            'div',
            { style: { flexDirection: 'column', gap: 3, alignItems: 'center' } },
            jsx(
              'div',
              { style: { flexDirection: 'row', gap: 1 } },
              jsx(SmallCommand, {
                icon: 'bold',
                onClick: toggleBold,
                accent: ACCENT,
                active: activeFormat().bold,
              }),
              jsx(SmallCommand, {
                icon: 'italic',
                onClick: toggleItalic,
                accent: ACCENT,
                active: activeFormat().italic,
              }),
              jsx(SmallCommand, {
                icon: 'underline',
                onClick: toggleUnderline,
                accent: ACCENT,
                active: activeFormat().underline,
              }),
              jsx(SmallCommand, {
                icon: 'fill',
                onClick: () => applyFormat({ fill: ACCENT.tint }),
                accent: ACCENT,
                active: activeFormat().fill === ACCENT.tint,
              })
            ),
            fillSwatches()
          ),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Alignment',
        children: [
          jsx(
            'div',
            { style: { flexDirection: 'column', gap: 1 } },
            jsx(
              'div',
              { style: { flexDirection: 'row', gap: 1 } },
              jsx(SmallCommand, {
                icon: 'alignLeft',
                onClick: () => align('left'),
                accent: ACCENT,
                active: activeFormat().align === 'left',
              }),
              jsx(SmallCommand, {
                icon: 'alignCenter',
                onClick: () => align('center'),
                accent: ACCENT,
                active: activeFormat().align === 'center',
              }),
              jsx(SmallCommand, {
                icon: 'alignRight',
                onClick: () => align('right'),
                accent: ACCENT,
                active: activeFormat().align === 'right',
              })
            ),
            jsx(SmallCommand, {
              icon: 'grid',
              label: 'Merge & center',
              accent: ACCENT,
              disabled: true,
              width: 108,
            })
          ),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Number',
        children: [
          jsx(
            'div',
            { style: { flexDirection: 'column', gap: 1 } },
            jsx(
              'div',
              { style: { flexDirection: 'row', gap: 1 } },
              jsx(SmallCommand, {
                icon: 'currency',
                label: '$',
                onClick: () => setNumber('currency', 2),
                accent: ACCENT,
                active: activeFormat().number === 'currency',
              }),
              jsx(SmallCommand, {
                icon: 'percent',
                label: '%',
                onClick: () => setNumber('percent', 1),
                accent: ACCENT,
                active: activeFormat().number === 'percent',
              }),
              jsx(SmallCommand, {
                icon: 'decimal',
                label: ',',
                onClick: () => setNumber('number', 0),
                accent: ACCENT,
                active: activeFormat().number === 'number',
              })
            ),
            jsx(
              'div',
              { style: { flexDirection: 'row', gap: 1 } },
              jsx(SmallCommand, {
                icon: 'plus',
                label: '.0',
                onClick: () => changeDecimals(1),
                accent: ACCENT,
              }),
              jsx(SmallCommand, {
                icon: 'minus',
                label: '.0',
                onClick: () => changeDecimals(-1),
                accent: ACCENT,
              })
            )
          ),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Styles',
        children: [
          jsx(BigCommand, {
            icon: 'table',
            label: 'Header',
            onClick: applyHeaderStyle,
            accent: ACCENT,
          }),
          jsx(BigCommand, {
            icon: 'sum',
            label: 'Total',
            onClick: applyTotalStyle,
            accent: ACCENT,
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Cells',
        children: [
          jsx(BigCommand, {
            icon: 'plus',
            label: 'New sheet',
            onClick: addSheet,
            accent: ACCENT,
          }),
          jsx(SmallCommand, {
            icon: 'minus',
            label: 'Delete sheet',
            onClick: deleteSheet,
            accent: ACCENT,
            disabled: sheets().length === 1,
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Editing',
        children: [
          jsx(BigCommand, {
            icon: 'sum',
            label: 'AutoSum',
            onClick: () => aggregate('SUM'),
            accent: ACCENT,
          }),
          jsx(BigCommand, {
            icon: 'sort',
            label: 'Sort A→Z',
            onClick: () => sortRange(1),
            accent: ACCENT,
          }),
          jsx(
            'div',
            { style: { flexDirection: 'column', gap: 1 } },
            jsx(SmallCommand, {
              icon: 'close',
              label: 'Clear',
              onClick: clearRange,
              accent: ACCENT,
            }),
            jsx(SmallCommand, {
              icon: 'search',
              label: 'Find',
              accent: ACCENT,
              disabled: true,
            })
          ),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'History',
        children: [
          jsx(BigCommand, {
            icon: 'undo',
            label: 'Undo',
            onClick: undo,
            accent: ACCENT,
          }),
          jsx(BigCommand, {
            icon: 'redo',
            label: 'Redo',
            onClick: redo,
            accent: ACCENT,
          }),
        ],
      }),
    ],
  })
}

function fileRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Workbook',
        children: [
          jsx(BigCommand, { icon: 'page', label: 'New', onClick: newWorkbook, accent: ACCENT }),
          jsx(BigCommand, { icon: 'page', label: 'Open', onClick: openWorkbook, accent: ACCENT }),
          jsx(BigCommand, { icon: 'save', label: 'Save', onClick: saveWorkbook, accent: ACCENT }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Export',
        children: [
          jsx(BigCommand, { icon: 'table', label: 'Export CSV', onClick: exportCsv, accent: ACCENT }),
          jsx(SmallCommand, { icon: 'copy', label: 'Copy summary', onClick: copySummary, accent: ACCENT }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Print',
        children: [
          jsx(BigCommand, { icon: 'print', label: 'Print', onClick: printWorkbook, accent: ACCENT }),
        ],
      }),
    ],
  })
}

function insertRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Tables',
        children: [
          jsx(BigCommand, { icon: 'table', label: 'Table', onClick: applyHeaderStyle, accent: ACCENT }),
          jsx(SmallCommand, { icon: 'plus', label: 'New sheet', onClick: addSheet, accent: ACCENT }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Illustrations',
        children: [
          jsx(BigCommand, { icon: 'chart', label: 'Chart', accent: ACCENT, disabled: true }),
          jsx(BigCommand, { icon: 'picture', label: 'Picture', accent: ACCENT, disabled: true }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Comments',
        children: [
          jsx(BigCommand, { icon: 'comment', label: 'Comment', accent: ACCENT, disabled: true }),
        ],
      }),
    ],
  })
}

function formulasRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Function library',
        children: [
          jsx(BigCommand, {
            icon: 'sum',
            label: 'AutoSum',
            onClick: () => aggregate('SUM'),
            accent: ACCENT,
          }),
          jsx(
            'div',
            { style: { flexDirection: 'column', gap: 1 } },
            jsx(SmallCommand, { icon: 'sum', label: 'AVERAGE', onClick: () => aggregate('AVERAGE'), accent: ACCENT }),
            jsx(SmallCommand, { icon: 'minus', label: 'MIN', onClick: () => aggregate('MIN'), accent: ACCENT }),
            jsx(SmallCommand, { icon: 'plus', label: 'MAX', onClick: () => aggregate('MAX'), accent: ACCENT })
          ),
          jsx(SmallCommand, { icon: 'list', label: 'COUNT', onClick: () => aggregate('COUNT'), accent: ACCENT }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Auditing',
        children: [
          jsx(BigCommand, {
            icon: 'formula',
            label: 'Show formulas',
            onClick: () => {
              setShowFormulas((value) => !value)
              setStatus(showFormulas() ? 'Showing results' : 'Showing formulas')
            },
            accent: ACCENT,
            active: showFormulas(),
          }),
          jsx(SmallCommand, {
            icon: 'check',
            label: 'Recalculate',
            onClick: () => setStatus('Formulas are live and recalculated'),
            accent: ACCENT,
          }),
        ],
      }),
    ],
  })
}

function dataRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Sort & filter',
        children: [
          jsx(BigCommand, { icon: 'sort', label: 'Sort A→Z', onClick: () => sortRange(1), accent: ACCENT }),
          jsx(BigCommand, { icon: 'sort', label: 'Sort Z→A', onClick: () => sortRange(-1), accent: ACCENT }),
          jsx(SmallCommand, { icon: 'filter', label: 'Filter', accent: ACCENT, disabled: true }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Data tools',
        children: [
          jsx(BigCommand, {
            icon: 'table',
            label: 'Remove duplicates',
            onClick: removeDuplicates,
            accent: ACCENT,
          }),
          jsx(SmallCommand, {
            icon: 'grid',
            label: 'Text to columns',
            accent: ACCENT,
            disabled: true,
          }),
        ],
      }),
    ],
  })
}

function viewRibbon(): SceneNode {
  return jsx(Ribbon, {
    accent: ACCENT,
    children: [
      jsx(RibbonGroup, {
        label: 'Show',
        children: [
          jsx(BigCommand, {
            icon: 'grid',
            label: 'Gridlines',
            onClick: () => {
              setShowGridlines((value) => !value)
              setStatus(showGridlines() ? 'Gridlines hidden' : 'Gridlines shown')
            },
            accent: ACCENT,
            active: showGridlines(),
          }),
          jsx(BigCommand, {
            icon: 'formula',
            label: 'Formula bar',
            onClick: () => {
              setShowFormulaBar((value) => !value)
              setStatus(showFormulaBar() ? 'Formula bar hidden' : 'Formula bar shown')
            },
            accent: ACCENT,
            active: showFormulaBar(),
          }),
          jsx(BigCommand, {
            icon: 'table',
            label: 'Headings',
            onClick: () => {
              setShowHeadings((value) => !value)
              setStatus(showHeadings() ? 'Headings hidden' : 'Headings shown')
            },
            accent: ACCENT,
            active: showHeadings(),
          }),
        ],
      }),
      jsx(RibbonGroup, {
        label: 'Zoom',
        children: [
          jsx(SmallCommand, {
            icon: 'zoom',
            label: '100%',
            onClick: () => setStatus('Zoom is fixed at 100% in this build'),
            accent: ACCENT,
          }),
        ],
      }),
    ],
  })
}

function renderRibbon(tabName: string): SceneNode {
  if (tabName === 'file') return fileRibbon()
  if (tabName === 'insert') return insertRibbon()
  if (tabName === 'formulas') return formulasRibbon()
  if (tabName === 'data') return dataRibbon()
  if (tabName === 'view') return viewRibbon()
  return homeRibbon()
}

function App(): ReturnType<typeof jsx> {
  return jsx(OfficeApp, {
    app: 'Excel',
    initial: 'X',
    file: 'Q4 Budget.xlsx',
    accent: ACCENT,
    tabs: ['File', 'Home', 'Insert', 'Formulas', 'Data', 'View'],
    activeTab: () => tab(),
    onTab: (name) => setTab(name),
    renderRibbon,
    statusLeft: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => status())
    ),
    statusCenter: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => statsText())
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => `${sheets().length} sheet${sheets().length === 1 ? '' : 's'}`)
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'column', minHeight: 0 } },
        dynamic(() => (showFormulaBar() ? jsx(FormulaBar, {}) : null)),
        dynamic(() => jsx(Grid, {})),
        dynamic(() => jsx(SheetTabs, {}))
      ),
    ],
  })
}

render(() => jsx(App))

async function runSheetBench(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  const samples: number[] = []
  const max = ROWS * ROW_HEIGHT - 560
  let last = performance.now()
  for (let frame = 0; frame < 120; frame += 1) {
    setScrollTop((frame * ROW_HEIGHT * 8) % max)
    await new Promise<number>((resolve) => requestAnimationFrame(resolve))
    const now = performance.now()
    samples.push(now - last)
    last = now
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length
  window.__benchResult = {
    frames: sorted.length,
    mean,
    p50: sorted[Math.floor(sorted.length / 2)]!,
    p95: sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)]!,
    dropped: sorted.filter((value) => value > 16.7).length,
    fps: 1000 / mean,
  }
}

if (
  typeof window !== 'undefined' &&
  window.location.search.includes('sheetBench=1')
) {
  void runSheetBench()
}

declare global {
  interface Window {
    __benchResult?: Record<string, number>
  }
}
