/**
 * Pure model for GitHub-flavored Markdown tables: parse, edit, and format.
 * No CodeMirror types here, so every operation is unit-testable.
 */

export type Alignment = "none" | "left" | "center" | "right"

export interface Table {
  header: string[]
  alignments: Alignment[]
  rows: string[][]
}

/** Position of a cell. Row -1 is the header; rows 0..n-1 are body rows. */
export interface CellPosition {
  row: number
  column: number
}

const DELIMITER_CELL = /^\s*:?-+:?\s*$/

/** Splits a table line into raw cell strings, honoring escaped pipes. */
export function splitRow(line: string): string[] {
  let text = line.trim()
  if (text.startsWith("|")) text = text.slice(1)
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1)
  const cells: string[] = []
  let current = ""
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === "\\" && text[i + 1] === "|") {
      current += "\\|"
      i++
    } else if (char === "|") {
      cells.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

export function isTableLine(line: string): boolean {
  return line.trim().startsWith("|") || /[^\\]\|/.test(line.trim())
}

export function isDelimiterLine(line: string): boolean {
  if (!isTableLine(line)) return false
  const cells = splitRow(line)
  return cells.length > 0 && cells.every((cell) => DELIMITER_CELL.test(cell))
}

function parseAlignment(cell: string): Alignment {
  const text = cell.trim()
  const left = text.startsWith(":")
  const right = text.endsWith(":")
  if (left && right) return "center"
  if (left) return "left"
  if (right) return "right"
  return "none"
}

/** Parses table lines (header, delimiter, body). Returns null if not a table. */
export function parseTable(lines: string[]): Table | null {
  if (lines.length < 2 || !isDelimiterLine(lines[1])) return null
  const header = splitRow(lines[0])
  const alignments = splitRow(lines[1]).map(parseAlignment)
  const width = Math.max(header.length, alignments.length)
  const pad = (cells: string[]) =>
    Array.from({ length: width }, (_, i) => cells[i] ?? "")
  return {
    header: pad(header),
    alignments: Array.from({ length: width }, (_, i) => alignments[i] ?? "none"),
    rows: lines.slice(2).map((line) => pad(splitRow(line))),
  }
}

function delimiter(alignment: Alignment, width: number): string {
  const dashes = "-".repeat(Math.max(3, width))
  switch (alignment) {
    case "left":
      return `:${dashes.slice(1)}`
    case "right":
      return `${dashes.slice(1)}:`
    case "center":
      return `:${dashes.slice(2)}:`
    default:
      return dashes
  }
}

function padCell(text: string, width: number, alignment: Alignment): string {
  const gap = width - text.length
  if (gap <= 0) return text
  if (alignment === "right") return " ".repeat(gap) + text
  if (alignment === "center") {
    const left = Math.floor(gap / 2)
    return " ".repeat(left) + text + " ".repeat(gap - left)
  }
  return text + " ".repeat(gap)
}

/** Formats a table with aligned pipes. */
export function formatTable(table: Table): string[] {
  const widths = table.header.map((cell, column) =>
    Math.max(
      3,
      cell.length,
      ...table.rows.map((row) => (row[column] ?? "").length)
    )
  )
  const line = (cells: string[]) =>
    `| ${cells
      .map((cell, column) => padCell(cell, widths[column], table.alignments[column]))
      .join(" | ")} |`
  return [
    line(table.header),
    `| ${table.alignments.map((a, column) => delimiter(a, widths[column])).join(" | ")} |`,
    ...table.rows.map(line),
  ]
}

/** Column index of an offset within a table line. */
export function columnAt(line: string, offset: number): number {
  const before = line.slice(0, offset)
  const leading = line.trimStart().startsWith("|") ? 1 : 0
  let pipes = 0
  for (let i = 0; i < before.length; i++) {
    if (before[i] === "\\") {
      i++
      continue
    }
    if (before[i] === "|") pipes++
  }
  return Math.max(0, pipes - leading)
}

/** Offset of the start of a cell's text within a formatted line. */
export function cellOffset(formattedLine: string, column: number): number {
  let pipes = 0
  for (let i = 0; i < formattedLine.length; i++) {
    if (formattedLine[i] === "|") {
      if (pipes === column) return Math.min(i + 2, formattedLine.length)
      pipes++
    }
  }
  return formattedLine.length
}

export function emptyTable(columns = 3, rows = 1): Table {
  return {
    header: Array.from({ length: columns }, (_, i) => `Column ${i + 1}`),
    alignments: Array.from({ length: columns }, () => "none"),
    rows: Array.from({ length: rows }, () => Array.from({ length: columns }, () => "")),
  }
}

export interface TableEdit {
  table: Table
  cursor: CellPosition
}

export function insertRowBelow(table: Table, at: CellPosition): TableEdit {
  const index = at.row + 1
  const rows = [...table.rows]
  rows.splice(index, 0, table.header.map(() => ""))
  return { table: { ...table, rows }, cursor: { row: index, column: at.column } }
}

export function insertColumnRight(table: Table, at: CellPosition): TableEdit {
  const index = at.column + 1
  const insert = <T,>(cells: T[], value: T) => [
    ...cells.slice(0, index),
    value,
    ...cells.slice(index),
  ]
  return {
    table: {
      header: insert(table.header, ""),
      alignments: insert(table.alignments, "none" as Alignment),
      rows: table.rows.map((row) => insert(row, "")),
    },
    cursor: { row: at.row, column: index },
  }
}

/** Deletes a body row. Returns null for the header, which a table always keeps. */
export function deleteRow(table: Table, at: CellPosition): TableEdit | null {
  if (at.row < 0) return null
  const rows = table.rows.filter((_, i) => i !== at.row)
  return {
    table: { ...table, rows },
    cursor: { row: Math.min(at.row, rows.length - 1), column: at.column },
  }
}

/** Deletes a column. Returns null when it is the last one. */
export function deleteColumn(table: Table, at: CellPosition): TableEdit | null {
  if (table.header.length <= 1) return null
  const remove = <T,>(cells: T[]) => cells.filter((_, i) => i !== at.column)
  return {
    table: {
      header: remove(table.header),
      alignments: remove(table.alignments),
      rows: table.rows.map(remove),
    },
    cursor: { row: at.row, column: Math.min(at.column, table.header.length - 2) },
  }
}

/** Next or previous cell in reading order, or null at either end. */
export function moveCell(
  table: Table,
  at: CellPosition,
  direction: 1 | -1
): CellPosition | null {
  const columns = table.header.length
  const index = (at.row + 1) * columns + at.column + direction
  const total = (table.rows.length + 1) * columns
  if (index < 0 || index >= total) return null
  return { row: Math.floor(index / columns) - 1, column: index % columns }
}
