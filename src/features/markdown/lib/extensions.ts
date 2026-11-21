import { defaultKeymap, history, historyKeymap, redoDepth, undoDepth } from "@codemirror/commands"
import { markdown } from "@codemirror/lang-markdown"
import { search } from "@codemirror/search"
import { Compartment, type Extension } from "@codemirror/state"
import {
  EditorView,
  drawSelection,
  keymap,
  lineNumbers,
  placeholder,
  type ViewUpdate,
} from "@codemirror/view"

import { announce } from "./commands/announce"
import { tableAt } from "./commands/table"
import { editorKeymap } from "./keymap"
import { editorPhrases } from "./phrases"
import { EDITOR_FONT_SIZES, type EditorPreferences } from "./preferences"
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
  placeholder?: string
  onDocChange?: (doc: string) => void
  onStatusChange?: (status: EditorStatus) => void
  onAnnounce?: (message: string) => void
}

const wrapping = new Compartment()
const gutter = new Compartment()
const spelling = new Compartment()
const fontSize = new Compartment()

function preferenceExtensions(preferences: EditorPreferences) {
  return {
    wrapping: preferences.lineWrapping ? EditorView.lineWrapping : [],
    gutter: preferences.lineNumbers ? lineNumbers() : [],
    spelling: EditorView.contentAttributes.of({
      spellcheck: preferences.spellCheck ? "true" : "false",
    }),
    fontSize: EditorView.theme({
      "&": { fontSize: EDITOR_FONT_SIZES[preferences.fontSize] },
    }),
  }
}

/** Applies changed preferences to a running editor without losing state. */
export function reconfigurePreferences(view: EditorView, preferences: EditorPreferences) {
  const next = preferenceExtensions(preferences)
  view.dispatch({
    effects: [
      wrapping.reconfigure(next.wrapping),
      gutter.reconfigure(next.gutter),
      spelling.reconfigure(next.spelling),
      fontSize.reconfigure(next.fontSize),
    ],
  })
}

/**
 * Base extensions for the Markdown editor. Tab is left unbound so keyboard
 * users can move focus out of the editor (WCAG 2.1.2, no keyboard trap).
 */
export function markdownExtensions(options: MarkdownExtensionOptions): Extension[] {
  const prefs = preferenceExtensions(options.preferences)
  return [
    history(),
    drawSelection(),
    markdown(),
    search({ top: true }),
    editorPhrases,
    editorTheme,
    editorHighlighting,
    placeholder(options.placeholder ?? "Start writing Markdown"),
    editorKeymap(),
    keymap.of([...historyKeymap, ...defaultKeymap]),
    wrapping.of(prefs.wrapping),
    gutter.of(prefs.gutter),
    spelling.of(prefs.spelling),
    fontSize.of(prefs.fontSize),
    EditorView.contentAttributes.of({
      "aria-label": options.label,
      "aria-multiline": "true",
    }),
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) options.onDocChange?.(update.state.doc.toString())
      for (const transaction of update.transactions) {
        for (const effect of transaction.effects) {
          if (effect.is(announce)) options.onAnnounce?.(effect.value)
        }
      }
      if (update.docChanged || update.selectionSet || update.transactions.length) {
        options.onStatusChange?.({
          canUndo: undoDepth(update.state) > 0,
          canRedo: redoDepth(update.state) > 0,
          inTable: tableAt(update.state) !== null,
        })
      }
    }),
  ]
}
