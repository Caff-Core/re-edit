import { EditorState, Facet, type Extension } from "@codemirror/state"
import { placeholder } from "@codemirror/view"

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
    phrases: {
      Find: "Find",
      Replace: "Replace",
      next: "Next",
      previous: "Previous",
      all: "Select all",
      "match case": "Match case",
      regexp: "Regular expression",
      "by word": "Whole word",
      replace: "Replace",
      "replace all": "Replace all",
      close: "Close",
      "current match": "Current match",
      "on line": "on line",
      "replaced $ matches": "Replaced $ matches",
      "replaced match on line $": "Replaced match on line $",
      "Go to line": "Go to line",
      go: "Go",
    } as Record<string, string>,
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
    phrases: {
      Find: "查找",
      Replace: "替换",
      next: "下一个",
      previous: "上一个",
      all: "全部选中",
      "match case": "区分大小写",
      regexp: "正则表达式",
      "by word": "全字匹配",
      replace: "替换",
      "replace all": "全部替换",
      close: "关闭",
      "current match": "当前匹配",
      "on line": "位于行",
      "replaced $ matches": "已替换 $ 处匹配",
      "replaced match on line $": "已替换第 $ 行的匹配",
      "Go to line": "跳转到行",
      go: "跳转",
    },
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
