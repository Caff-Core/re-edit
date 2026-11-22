import { Compartment, type Extension } from "@codemirror/state"
import { EditorView, lineNumbers } from "@codemirror/view"

import {
  EDITOR_FONT_FAMILIES,
  EDITOR_FONT_SIZES,
  type EditorPreferences,
} from "./preferences"

const wrapping = new Compartment()
const gutter = new Compartment()
const spelling = new Compartment()
const fontSize = new Compartment()
const fontFamily = new Compartment()

function preferenceParts(preferences: EditorPreferences) {
  return {
    wrapping: preferences.lineWrapping ? EditorView.lineWrapping : [],
    gutter: preferences.lineNumbers ? lineNumbers() : [],
    spelling: EditorView.contentAttributes.of({
      spellcheck: preferences.spellCheck ? "true" : "false",
    }),
    fontSize: EditorView.theme({
      "&": { fontSize: EDITOR_FONT_SIZES[preferences.fontSize] },
    }),
    fontFamily: EditorView.theme({
      ".cm-scroller": {
        fontFamily: EDITOR_FONT_FAMILIES[preferences.fontFamily],
      },
    }),
  }
}

/** Applies changed preferences to a running editor without losing state. */
export function reconfigurePreferences(
  view: EditorView,
  preferences: EditorPreferences
) {
  const next = preferenceParts(preferences)
  view.dispatch({
    effects: [
      wrapping.reconfigure(next.wrapping),
      gutter.reconfigure(next.gutter),
      spelling.reconfigure(next.spelling),
      fontSize.reconfigure(next.fontSize),
      fontFamily.reconfigure(next.fontFamily),
    ],
  })
}

/** The editor preferences as reconfigurable extensions, shared by every CodeMirror editor. */
export function preferenceExtensions(
  preferences: EditorPreferences
): Extension[] {
  const parts = preferenceParts(preferences)
  return [
    wrapping.of(parts.wrapping),
    gutter.of(parts.gutter),
    spelling.of(parts.spelling),
    fontSize.of(parts.fontSize),
    fontFamily.of(parts.fontFamily),
  ]
}
