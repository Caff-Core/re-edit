import {
  defaultKeymap,
  history,
  historyKeymap,
  redoDepth,
  undoDepth,
} from "@codemirror/commands"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { search } from "@codemirror/search"
import { Compartment, type Extension } from "@codemirror/state"
import {
  EditorView,
  drawSelection,
  keymap,
  type ViewUpdate,
} from "@codemirror/view"

import { announce } from "./commands/announce"
import { tableAt } from "./commands/table"
import { markdownBlocks } from "./blocks"
import { editorKeymap } from "./keymap"
import { languageExtensions, type EditorMessages } from "./editor-messages"
import type { EditorPreferences } from "@/lib/codemirror/preferences"
import {
  preferenceExtensions,
  reconfigurePreferences,
} from "@/lib/codemirror/setup"
import { editorHighlighting, editorTheme } from "./theme"

export interface EditorStatus {
  canUndo: boolean
  canRedo: boolean
  inTable: boolean
}

export interface MarkdownExtensionOptions {
  /** Accessible name of the editing surface. */
  label: string
  preferences: EditorPreferences
  /** Strings in the interface language; swap with `reconfigureLanguage`. */
  messages: EditorMessages
  onDocChange?: (doc: string) => void
  onStatusChange?: (status: EditorStatus) => void
  onAnnounce?: (message: string) => void
}

const language = new Compartment()
const accessibleName = new Compartment()

const labelAttribute = (label: string) =>
  EditorView.contentAttributes.of({ "aria-label": label })

/**
 * Applies a new interface language and accessible name without recreating
 * the editor, so the document and its undo history survive.
 */
export function reconfigureLanguage(
  view: EditorView,
  messages: EditorMessages,
  label: string
) {
  view.dispatch({
    effects: [
      language.reconfigure(languageExtensions(messages)),
      accessibleName.reconfigure(labelAttribute(label)),
    ],
  })
}

/**
 * Base extensions for the Markdown editor. Tab is left unbound so keyboard
 * users can move focus out of the editor (WCAG 2.1.2, no keyboard trap).
 */
export function markdownExtensions(
  options: MarkdownExtensionOptions
): Extension[] {
  return [
    history(),
    drawSelection(),
    // GFM on top of CommonMark; fenced code loads its language on first use.
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    markdownBlocks,
    search({ top: true }),
    language.of(languageExtensions(options.messages)),
    editorTheme,
    editorHighlighting,
    editorKeymap(),
    keymap.of([...historyKeymap, ...defaultKeymap]),
    ...preferenceExtensions(options.preferences),
    accessibleName.of(labelAttribute(options.label)),
    EditorView.contentAttributes.of({ "aria-multiline": "true" }),
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) options.onDocChange?.(update.state.doc.toString())
      for (const transaction of update.transactions) {
        for (const effect of transaction.effects) {
          if (effect.is(announce)) options.onAnnounce?.(effect.value)
        }
      }
      if (
        update.docChanged ||
        update.selectionSet ||
        update.transactions.length
      ) {
        options.onStatusChange?.({
          canUndo: undoDepth(update.state) > 0,
          canRedo: redoDepth(update.state) > 0,
          inTable: tableAt(update.state) !== null,
        })
      }
    }),
  ]
}

// Re-exported so the Markdown editor keeps one import for its setup.
export { reconfigurePreferences }
