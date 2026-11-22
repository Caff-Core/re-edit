import { describe, expect, it } from "vitest"

import {
  cellOffset,
  displayWidth,
  columnAt,
  deleteColumn,
  deleteRow,
  emptyTable,
  formatTable,
  insertColumnRight,
  insertRowBelow,
  isDelimiterLine,
  moveCell,
  parseTable,
  splitRow,
} from "./table-model"

const source = [
  "| Name | Value |",
  "| ---- | ----: |",
  "| one  |     1 |",
  "| two  |     2 |",
]

describe("table model", () => {
  it("splits rows and keeps escaped pipes inside a cell", () => {
    expect(splitRow("| a | b \\| c | d |")).toEqual(["a", "b \\| c", "d"])
    expect(splitRow("a | b")).toEqual(["a", "b"])
  })

  it("recognizes delimiter rows", () => {
    expect(isDelimiterLine("| --- | :-: | --: |")).toBe(true)
    expect(isDelimiterLine("| a | b |")).toBe(false)
    expect(isDelimiterLine("plain text")).toBe(false)
  })

  it("parses header, alignments, and rows", () => {
    expect(parseTable(source)).toEqual({
      header: ["Name", "Value"],
      alignments: ["none", "right"],
      rows: [
        ["one", "1"],
        ["two", "2"],
      ],
    })
    expect(parseTable(["| a |", "| b |"])).toBeNull()
  })

  it("pads short rows to the header width", () => {
    expect(parseTable(["| a | b |", "| - | - |", "| x |"])?.rows).toEqual([
      ["x", ""],
    ])
  })

  it("formats with aligned pipes and alignment markers", () => {
    const table = parseTable(["|Name|Value|", "|:-:|--:|", "|a long name|1|"])!
    expect(formatTable(table)).toEqual([
      "|    Name     | Value |",
      "| :---------: | ----: |",
      "| a long name |     1 |",
    ])
  })

  it("finds the column under an offset and the start of a cell", () => {
    const line = "| one  |     1 |"
    expect(columnAt(line, 3)).toBe(0)
    expect(columnAt(line, 10)).toBe(1)
    expect(cellOffset(line, 1)).toBe(9)
  })

  it("inserts a row below and moves the cursor into it", () => {
    const table = parseTable(source)!
    const edit = insertRowBelow(table, { row: 0, column: 1 })
    expect(edit.table.rows).toEqual([
      ["one", "1"],
      ["", ""],
      ["two", "2"],
    ])
    expect(edit.cursor).toEqual({ row: 1, column: 1 })
  })

  it("inserts a row as the first body row from the header", () => {
    const edit = insertRowBelow(parseTable(source)!, { row: -1, column: 0 })
    expect(edit.table.rows[0]).toEqual(["", ""])
    expect(edit.cursor.row).toBe(0)
  })

  it("inserts a column to the right", () => {
    const edit = insertColumnRight(parseTable(source)!, { row: 0, column: 0 })
    expect(edit.table.header).toEqual(["Name", "", "Value"])
    expect(edit.table.alignments).toEqual(["none", "none", "right"])
    expect(edit.table.rows[1]).toEqual(["two", "", "2"])
    expect(edit.cursor).toEqual({ row: 0, column: 1 })
  })

  it("deletes body rows but never the header", () => {
    const table = parseTable(source)!
    expect(deleteRow(table, { row: 1, column: 0 })?.table.rows).toEqual([
      ["one", "1"],
    ])
    expect(deleteRow(table, { row: -1, column: 0 })).toBeNull()
  })

  it("deletes columns but keeps at least one", () => {
    const table = parseTable(source)!
    expect(deleteColumn(table, { row: 0, column: 0 })?.table.header).toEqual([
      "Value",
    ])
    expect(deleteColumn(emptyTable(1), { row: 0, column: 0 })).toBeNull()
  })

  it("moves between cells in reading order and stops at the ends", () => {
    const table = parseTable(source)!
    expect(moveCell(table, { row: -1, column: 1 }, 1)).toEqual({
      row: 0,
      column: 0,
    })
    expect(moveCell(table, { row: 0, column: 0 }, -1)).toEqual({
      row: -1,
      column: 1,
    })
    expect(moveCell(table, { row: -1, column: 0 }, -1)).toBeNull()
    expect(moveCell(table, { row: 1, column: 1 }, 1)).toBeNull()
  })
})

describe("table width with wide characters", () => {
  it("counts CJK characters as two columns", () => {
    expect(displayWidth("abc")).toBe(3)
    expect(displayWidth("列 1")).toBe(4)
    expect(displayWidth("名称")).toBe(4)
  })

  it("aligns pipes when cells mix Chinese and Latin text", () => {
    const lines = formatTable({
      header: ["名称", "Name"],
      alignments: ["none", "none"],
      rows: [["编辑器", "editor"]],
    })
    expect(lines).toEqual([
      "| 名称   | Name   |",
      "| ------ | ------ |",
      "| 编辑器 | editor |",
    ])
  })
})
