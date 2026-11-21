import { EditorSelection, EditorState, type StateCommand } from "@codemirror/state"
import { describe, expect, it } from "vitest"

import { announce } from "./announce"
import {
  addTableColumn,
  addTableRow,
  deleteTableColumn,
  deleteTableRow,
  insertTable,
  nextTableCell,
  previousTableCell,
  tableAt,
} from "./table"

const TABLE = ["| Name | Value |", "| ---- | ----- |", "| one  | 1     |"].join("\n")

function stateAt(doc: string, needle: string) {
  return EditorState.create({ doc, selection: EditorSelection.cursor(doc.indexOf(needle)) })
}

function run(command: StateCommand, state: EditorState) {
  let next = state
  const messages: string[] = []
  const handled = command({
    state,
    dispatch: (tr) => {
      next = tr.state
      for (const effect of tr.effects) if (effect.is(announce)) messages.push(effect.value)
    },
  })
  const head = next.selection.main.head
  const line = next.doc.lineAt(head)
  return {
    handled,
    doc: next.doc.toString(),
    messages,
    lineText: line.text,
    column: head - line.from,
  }
}

describe("tableAt", () => {
  it("finds the table and cell under the cursor", () => {
    const context = tableAt(stateAt(`intro\n\n${TABLE}\n\nafter`, "1 "))
    expect(context).toMatchObject({ firstLine: 3, lastLine: 5, cell: { row: 0, column: 1 } })
  })

  it("returns null outside a table", () => {
    expect(tableAt(stateAt(`intro\n\n${TABLE}`, "intro"))).toBeNull()
  })
})

describe("table commands", () => {
  it("adds a formatted row below and announces it", () => {
    const result = run(addTableRow, stateAt(TABLE, "one"))
    expect(result.doc).toBe(
      ["| Name | Value |", "| ---- | ----- |", "| one  | 1     |", "|      |       |"].join("\n")
    )
    expect(result.messages).toEqual(["Row added, row 2, column 1"])
    expect(result.lineText).toBe("|      |       |")
    expect(result.column).toBe(2)
  })

  it("adds a column to the right of the cursor", () => {
    const result = run(addTableColumn, stateAt(TABLE, "Name"))
    expect(result.doc.split("\n")[0]).toBe("| Name |     | Value |")
    expect(result.messages).toEqual(["Column added, header row, column 2"])
  })

  it("deletes the current row and column", () => {
    expect(run(deleteTableRow, stateAt(TABLE, "one")).doc).toBe(
      ["| Name | Value |", "| ---- | ----- |"].join("\n")
    )
    expect(run(deleteTableColumn, stateAt(TABLE, "Value")).doc).toBe(
      ["| Name |", "| ---- |", "| one  |"].join("\n")
    )
  })

  it("refuses to delete the header row and says so", () => {
    const result = run(deleteTableRow, stateAt(TABLE, "Name"))
    expect(result.doc).toBe(TABLE)
    expect(result.messages).toEqual(["Not available here"])
  })

  it("moves between cells and announces the position", () => {
    const next = run(nextTableCell, stateAt(TABLE, "Value"))
    expect(next.lineText).toBe("| one  | 1     |")
    expect(next.messages).toEqual(["row 1, column 1"])
    const previous = run(previousTableCell, stateAt(TABLE, "Name"))
    expect(previous.messages).toEqual(["First cell"])
  })

  it("does nothing outside a table so default keys still work", () => {
    expect(run(addTableRow, stateAt("plain text", "text")).handled).toBe(false)
    expect(run(nextTableCell, stateAt("plain text", "text")).handled).toBe(false)
  })

  it("inserts a table between blank lines so GFM ends it, with the first header selected", () => {
    let state = stateAt("Intro\nOutro", "Intro")
    state = state.update({ selection: EditorSelection.cursor(5) }).state
    let next = state
    insertTable({ state, dispatch: (tr) => (next = tr.state) })
    const { from, to } = next.selection.main
    expect(next.doc.toString()).toBe(
      [
        "Intro",
        "",
        "| Column 1 | Column 2 | Column 3 |",
        "| -------- | -------- | -------- |",
        "|          |          |          |",
        "",
        "Outro",
      ].join("\n")
    )
    expect(next.sliceDoc(from, to)).toBe("Column 1")
  })
})
