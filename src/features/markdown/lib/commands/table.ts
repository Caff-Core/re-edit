import { EditorSelection, type EditorState, type StateCommand } from "@codemirror/state"

import { announce } from "./announce"
import {
  cellOffset,
  columnAt,
  deleteColumn,
  deleteRow,
  emptyTable,
  formatTable,
  insertColumnRight,
  insertRowBelow,
  isTableLine,
  moveCell,
  parseTable,
  type CellPosition,
  type Table,
  type TableEdit,
} from "./table-model"

export interface TableContext {
  /** Document line numbers of the first and last table lines. */
  firstLine: number
  lastLine: number
  table: Table
  cell: CellPosition
}

/** The table under the main cursor, if any. */
export function tableAt(state: EditorState): TableContext | null {
  const head = state.selection.main.head
  const current = state.doc.lineAt(head)
  if (!isTableLine(current.text)) return null
  let first = current.number
  let last = current.number
  while (first > 1 && isTableLine(state.doc.line(first - 1).text)) first--
  while (last < state.doc.lines && isTableLine(state.doc.line(last + 1).text)) last++
  const lines: string[] = []
  for (let n = first; n <= last; n++) lines.push(state.doc.line(n).text)
  const table = parseTable(lines)
  if (!table) return null
  const index = current.number - first
  if (index === 1) {
    // On the delimiter row: treat as the header.
    return { firstLine: first, lastLine: last, table, cell: { row: -1, column: 0 } }
  }
  const column = Math.min(
    columnAt(current.text, head - current.from),
    table.header.length - 1
  )
  return {
    firstLine: first,
    lastLine: last,
    table,
    cell: { row: index === 0 ? -1 : index - 2, column },
  }
}

function lineIndexOf(row: number): number {
  return row < 0 ? 0 : row + 2
}

function replaceTable(
  state: EditorState,
  context: Pick<TableContext, "firstLine" | "lastLine">,
  edit: TableEdit,
  message: string
) {
  const formatted = formatTable(edit.table)
  const from = state.doc.line(context.firstLine).from
  const to = state.doc.line(context.lastLine).to
  const text = formatted.join("\n")
  const targetLine = lineIndexOf(edit.cursor.row)
  const lineStart = formatted.slice(0, targetLine).reduce((sum, l) => sum + l.length + 1, 0)
  const anchor = from + lineStart + cellOffset(formatted[targetLine], edit.cursor.column)
  return state.update({
    changes: { from, to, insert: text },
    selection: EditorSelection.cursor(anchor),
    effects: announce.of(message),
    scrollIntoView: true,
    userEvent: "input.table",
  })
}

function tableCommand(
  run: (context: TableContext) => { edit: TableEdit; message: string } | null
): StateCommand {
  return ({ state, dispatch }) => {
    const context = tableAt(state)
    if (!context) return false
    const result = run(context)
    if (!result) {
      dispatch(state.update({ effects: announce.of("Not available here") }))
      return true
    }
    dispatch(replaceTable(state, context, result.edit, result.message))
    return true
  }
}

function describe(cell: CellPosition): string {
  const row = cell.row < 0 ? "header row" : `row ${cell.row + 1}`
  return `${row}, column ${cell.column + 1}`
}

export const addTableRow = tableCommand(({ table, cell }) => {
  const edit = insertRowBelow(table, cell)
  return { edit, message: `Row added, ${describe(edit.cursor)}` }
})

export const addTableColumn = tableCommand(({ table, cell }) => {
  const edit = insertColumnRight(table, cell)
  return { edit, message: `Column added, ${describe(edit.cursor)}` }
})

export const deleteTableRow = tableCommand(({ table, cell }) => {
  const edit = deleteRow(table, cell)
  return edit && { edit, message: `Row deleted, ${table.rows.length - 1} rows left` }
})

export const deleteTableColumn = tableCommand(({ table, cell }) => {
  const edit = deleteColumn(table, cell)
  return edit && { edit, message: `Column deleted, ${edit.table.header.length} columns left` }
})

export const formatCurrentTable = tableCommand(({ table, cell }) => ({
  edit: { table, cursor: cell },
  message: "Table formatted",
}))

function moveCommand(direction: 1 | -1): StateCommand {
  return ({ state, dispatch }) => {
    const context = tableAt(state)
    if (!context) return false
    const target = moveCell(context.table, context.cell, direction)
    if (!target) {
      dispatch(
        state.update({
          effects: announce.of(direction > 0 ? "Last cell" : "First cell"),
        })
      )
      return true
    }
    dispatch(
      replaceTable(state, context, { table: context.table, cursor: target }, describe(target))
    )
    return true
  }
}

export const nextTableCell = moveCommand(1)
export const previousTableCell = moveCommand(-1)

/** Inserts a 3 by 1 table on its own lines and puts the cursor in the first header cell. */
export const insertTable: StateCommand = ({ state, dispatch }) => {
  const line = state.doc.lineAt(state.selection.main.head)
  const formatted = formatTable(emptyTable())
  const needsBreakBefore = line.text.trim().length > 0
  const before = needsBreakBefore ? "\n\n" : ""
  const next = line.number < state.doc.lines ? state.doc.line(line.number + 1) : null
  const after = next && next.text.trim().length > 0 ? "\n" : ""
  const from = needsBreakBefore ? line.to : line.from
  const to = line.to
  const insert = before + formatted.join("\n") + after
  const tableStart = from + before.length
  dispatch(
    state.update({
      changes: { from, to, insert },
      selection: EditorSelection.range(tableStart + 2, tableStart + 2 + "Column 1".length),
      effects: announce.of("Table inserted, 3 columns, header row, column 1"),
      scrollIntoView: true,
      userEvent: "input.table",
    })
  )
  return true
}
