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
  ".cm-gutters": {
    backgroundColor: "var(--background)",
    color: "var(--muted-foreground)",
    border: "none",
  },
  ".cm-panels": {
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
  },
  ".cm-panels-top": { borderBottom: "1px solid var(--border)" },
  // Inline layout: CodeMirror's <br> splits the Find and Replace rows.
  ".cm-search": {
    padding: "0.25rem 0.75rem 0.5rem",
    fontFamily: "var(--font-sans)",
    fontSize: "0.75rem",
  },
  ".cm-search > *": { margin: "0.25rem 0.5rem 0 0", verticalAlign: "middle" },
  ".cm-search label": { display: "inline-flex", alignItems: "center", gap: "0.25rem" },
  ".cm-search input[type=checkbox]": { accentColor: "var(--primary)" },
  ".cm-textfield": {
    height: "1.75rem",
    padding: "0 0.5rem",
    border: "1px solid var(--input)",
    borderRadius: "var(--radius-md, 0.375rem)",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    fontSize: "0.75rem",
  },
  ".cm-textfield:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "1px",
  },
  ".cm-button": {
    height: "1.75rem",
    padding: "0 0.5rem",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md, 0.375rem)",
    backgroundImage: "none",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    fontSize: "0.75rem",
  },
  ".cm-button:hover": { backgroundColor: "var(--muted)" },
  ".cm-button:focus-visible": { outline: "2px solid var(--ring)", outlineOffset: "1px" },
  ".cm-panel.cm-search": { position: "relative", paddingRight: "2.5rem" },
  '.cm-panel.cm-search [name="close"]': {
    position: "absolute",
    top: "0.5rem",
    right: "0.75rem",
    fontSize: "1rem",
    lineHeight: "1.75rem",
    color: "var(--muted-foreground)",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in oklch, var(--primary) 20%, transparent)",
  },
  ".cm-searchMatch-selected": {
    backgroundColor: "color-mix(in oklch, var(--primary) 40%, transparent)",
  },
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
