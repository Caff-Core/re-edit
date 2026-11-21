import { openSearchPanel, searchKeymap } from "@codemirror/search"
import { Prec, type Extension } from "@codemirror/state"
import { EditorView, keymap, type KeyBinding } from "@codemirror/view"

import { insertLink, toggleHeading, toggleInline } from "./commands/formatting"
import {
  addTableColumn,
  addTableRow,
  deleteTableColumn,
  deleteTableRow,
  insertTable,
  nextTableCell,
  previousTableCell,
} from "./commands/table"

/** Shortcuts shown in tooltips and menus. Linux and Windows notation. */
export const SHORTCUTS = {
  undo: "Ctrl+Z",
  redo: "Ctrl+Y",
  bold: "Ctrl+B",
  italic: "Ctrl+I",
  code: "Ctrl+E",
  link: "Ctrl+K",
  find: "Ctrl+F",
  insertTable: "Ctrl+Alt+T",
  addRow: "Ctrl+Enter",
  addColumn: "Ctrl+Shift+Enter",
  deleteRow: "Ctrl+Alt+Backspace",
  deleteColumn: "Ctrl+Alt+Shift+Backspace",
  nextCell: "Alt+Right",
  previousCell: "Alt+Left",
} as const

const formattingBindings: KeyBinding[] = [
  { key: "Mod-b", run: toggleInline("**") },
  { key: "Mod-i", run: toggleInline("_") },
  { key: "Mod-e", run: toggleInline("`") },
  { key: "Mod-k", run: insertLink },
  ...[1, 2, 3, 4, 5, 6].map((level) => ({
    key: `Mod-Alt-${level}`,
    run: toggleHeading(level),
  })),
  { key: "Mod-Alt-t", run: insertTable },
]

// Table commands return false outside a table, so the default bindings for
// these keys (new line, cursor by syntax) still apply elsewhere.
const tableBindings: KeyBinding[] = [
  { key: "Mod-Enter", run: addTableRow },
  { key: "Mod-Shift-Enter", run: addTableColumn },
  { key: "Mod-Alt-Backspace", run: deleteTableRow },
  { key: "Mod-Alt-Shift-Backspace", run: deleteTableColumn },
  { key: "Alt-ArrowRight", run: nextTableCell },
  { key: "Alt-ArrowLeft", run: previousTableCell },
]

/**
 * Keys the app shell also listens for on the window. The editor handles them,
 * so stop them here; otherwise Ctrl+B would also collapse the sidebar. An
 * observer, not a handler: CodeMirror skips handlers once a keymap has
 * handled the key, but always runs observers.
 */
const editorOwnedKeys = EditorView.domEventObservers({
  keydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.stopPropagation()
    }
  },
})

export function editorKeymap(): Extension {
  return [
    Prec.high(keymap.of([...formattingBindings, ...tableBindings])),
    keymap.of(searchKeymap),
    editorOwnedKeys,
  ]
}

export { openSearchPanel }
