import { EditorState } from "@codemirror/state"

/**
 * Interface strings for CodeMirror's built-in panels, in sentence case.
 * Keys are CodeMirror's phrase IDs. Simplified Chinese arrives with 004.03.
 */
export const editorPhrases = EditorState.phrases.of({
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
})
