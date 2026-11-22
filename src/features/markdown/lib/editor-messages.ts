import { EditorState, Facet, type Extension } from "@codemirror/state"
import { placeholder } from "@codemirror/view"

import { codemirrorPhrases } from "@/lib/codemirror/phrases"
import { defineMessages } from "@/lib/i18n"

/** Cell position words for table announcements. */
const cellEn = (row: number, column: number) =>
  `${row < 0 ? "header row" : `row ${row + 1}`}, column ${column + 1}`
const cellZh = (row: number, column: number) =>
  `${row < 0 ? "表头行" : `第 ${row + 1} 行`}，第 ${column + 1} 列`

/**
 * Strings inside the editor: the placeholder, table announcements, and
 * CodeMirror's built-in panels. `phrases` keys are CodeMirror's phrase IDs.
 */
export const editorMessages = defineMessages({
  en: {
    placeholder: "Start writing Markdown",
    table: {
      notAvailable: "Not available here",
      lastCell: "Last cell",
      firstCell: "First cell",
      cell: cellEn,
      rowAdded: (row: number, column: number) =>
        `Row added, ${cellEn(row, column)}`,
      columnAdded: (row: number, column: number) =>
        `Column added, ${cellEn(row, column)}`,
      rowDeleted: (left: number) => `Row deleted, ${left} rows left`,
      columnDeleted: (left: number) => `Column deleted, ${left} columns left`,
      formatted: "Table formatted",
      inserted: (columns: number) =>
        `Table inserted, ${columns} columns, ${cellEn(-1, 0)}`,
      columnHeader: (column: number) => `Column ${column}`,
    },
    phrases: codemirrorPhrases.en,
  },
  "zh-CN": {
    placeholder: "开始编写 Markdown",
    table: {
      notAvailable: "此处不可用",
      lastCell: "最后一个单元格",
      firstCell: "第一个单元格",
      cell: cellZh,
      rowAdded: (row: number, column: number) =>
        `已添加行，${cellZh(row, column)}`,
      columnAdded: (row: number, column: number) =>
        `已添加列，${cellZh(row, column)}`,
      rowDeleted: (left: number) => `已删除行，剩余 ${left} 行`,
      columnDeleted: (left: number) => `已删除列，剩余 ${left} 列`,
      formatted: "表格已对齐",
      inserted: (columns: number) =>
        `已插入表格，${columns} 列，${cellZh(-1, 0)}`,
      columnHeader: (column: number) => `列 ${column}`,
    },
    phrases: codemirrorPhrases["zh-CN"],
  },
})

export type EditorMessages = (typeof editorMessages)["en"]

/** The editor's current strings, read by commands that announce changes. */
export const editorStrings = Facet.define<EditorMessages, EditorMessages>({
  combine: (values) => values[0] ?? editorMessages.en,
})

/** Everything language-dependent in the editor, for one compartment. */
export function languageExtensions(messages: EditorMessages): Extension {
  return [
    editorStrings.of(messages),
    EditorState.phrases.of(messages.phrases),
    placeholder(messages.placeholder),
  ]
}
