import { defaultKeymap, history, historyKeymap, redoDepth, undoDepth } from "@codemirror/commands"
import { markdown } from "@codemirror/lang-markdown"
import type { Extension } from "@codemirror/state"
import {
  EditorView,
  drawSelection,
  keymap,
  placeholder,
  type ViewUpdate,
} from "@codemirror/view"

import { editorHighlighting, editorTheme } from "./theme"

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
}

export interface MarkdownExtensionOptions {
  /** Accessible name of the editing surface. */
  label: string
  placeholder?: string
  onDocChange?: (doc: string) => void
  onHistoryChange?: (history: HistoryState) => void
}

/**
 * Base extensions for the Markdown editor. Tab is left unbound so keyboard
 * users can move focus out of the editor (WCAG 2.1.2, no keyboard trap).
 */
export function markdownExtensions(options: MarkdownExtensionOptions): Extension[] {
  return [
    history(),
    drawSelection(),
    EditorView.lineWrapping,
    markdown(),
    editorTheme,
    editorHighlighting,
    placeholder(options.placeholder ?? "Start writing Markdown"),
    keymap.of([...historyKeymap, ...defaultKeymap]),
    EditorView.contentAttributes.of({
      "aria-label": options.label,
      "aria-multiline": "true",
      spellcheck: "true",
    }),
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (!update.docChanged && !update.transactions.length) return
      if (update.docChanged) options.onDocChange?.(update.state.doc.toString())
      options.onHistoryChange?.({
        canUndo: undoDepth(update.state) > 0,
        canRedo: redoDepth(update.state) > 0,
      })
    }),
  ]
}
