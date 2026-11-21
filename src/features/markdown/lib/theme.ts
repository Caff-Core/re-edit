import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { tags } from "@lezer/highlight"

/**
 * Editor chrome built from the app's semantic tokens, so light, dark, and
 * future themes apply without a separate CodeMirror theme per mode.
 */
export const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--foreground)",
    backgroundColor: "var(--background)",
    fontSize: "0.875rem",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.6",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "1rem 0",
    caretColor: "var(--foreground)",
    maxWidth: "80ch",
  },
  ".cm-line": { padding: "0 1.5rem" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--foreground)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
    { backgroundColor: "color-mix(in oklch, var(--primary) 25%, transparent)" },
  ".cm-placeholder": { color: "var(--muted-foreground)" },
})

const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "600" },
  { tag: tags.heading1, fontWeight: "700" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, textDecoration: "underline" },
  { tag: tags.url, color: "var(--muted-foreground)", textDecoration: "underline" },
  { tag: tags.monospace, backgroundColor: "var(--muted)", borderRadius: "0.25rem" },
  { tag: tags.quote, color: "var(--muted-foreground)", fontStyle: "italic" },
  {
    tag: [tags.processingInstruction, tags.meta, tags.contentSeparator],
    color: "var(--muted-foreground)",
  },
])

export const editorHighlighting = syntaxHighlighting(markdownHighlight)
