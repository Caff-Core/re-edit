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
  // The prose font comes from the editor preferences (see extensions.ts).
  ".cm-scroller": {
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
  ".cm-search label": {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
  },
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
  ".cm-button:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "1px",
  },
  ".cm-panel.cm-search": { position: "relative", paddingRight: "2.5rem" },
  '.cm-panel.cm-search [name="close"]': {
    position: "absolute",
    top: "0.5rem",
    right: "0.75rem",
    fontSize: "1rem",
    lineHeight: "1.75rem",
    color: "var(--muted-foreground)",
  },
  // Block-level Markdown, from the line classes in blocks.ts.
  ".cm-md-codeblock": {
    backgroundColor: "var(--muted)",
    fontFamily: "var(--font-mono)",
  },
  ".cm-md-codeblock-start": {
    borderTopLeftRadius: "var(--radius-md, 0.375rem)",
    borderTopRightRadius: "var(--radius-md, 0.375rem)",
  },
  ".cm-md-codeblock-end": {
    borderBottomLeftRadius: "var(--radius-md, 0.375rem)",
    borderBottomRightRadius: "var(--radius-md, 0.375rem)",
  },
  // A bar in the line's left padding, so quoted text does not shift.
  ".cm-md-quote": {
    backgroundImage: "linear-gradient(var(--primary), var(--primary))",
    backgroundSize: "3px 100%",
    backgroundPosition: "0.75rem 0",
    backgroundRepeat: "no-repeat",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in oklch, var(--primary) 20%, transparent)",
  },
  ".cm-searchMatch-selected": {
    backgroundColor: "color-mix(in oklch, var(--primary) 40%, transparent)",
  },
})

/**
 * Per-theme code colors shared with the preview (markdown.css). The editor
 * host carries `markdown-body` so these resolve in every theme and keep the
 * contrast the theme test checks.
 */
const syntax = {
  keyword: "var(--md-syntax-keyword)",
  string: "var(--md-syntax-string)",
  number: "var(--md-syntax-number)",
  title: "var(--md-syntax-title)",
  comment: "var(--md-syntax-comment)",
}

/**
 * Styled source, in the manner of Obsidian's source view: Markdown marks stay
 * visible but recede, structure gets weight and size, and code inside fenced
 * blocks is colored by its language.
 */
export const markdownHighlight = HighlightStyle.define([
  // Markdown structure.
  { tag: tags.heading, fontWeight: "600" },
  { tag: tags.heading1, fontSize: "1.6em", fontWeight: "700" },
  { tag: tags.heading2, fontSize: "1.4em" },
  { tag: tags.heading3, fontSize: "1.2em" },
  { tag: tags.heading4, fontSize: "1.1em" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  {
    tag: tags.strikethrough,
    textDecoration: "line-through",
    color: "var(--muted-foreground)",
  },
  { tag: tags.link, color: syntax.number },
  {
    tag: tags.url,
    color: "var(--muted-foreground)",
    textDecoration: "underline",
  },
  {
    tag: tags.monospace,
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--muted)",
    borderRadius: "0.25rem",
  },
  { tag: tags.quote, color: "var(--muted-foreground)", fontStyle: "italic" },
  {
    tag: [tags.processingInstruction, tags.meta, tags.contentSeparator],
    color: "var(--muted-foreground)",
  },
  // Code inside fenced blocks, mapped like the preview's highlight.js classes.
  {
    tag: [
      tags.keyword,
      tags.modifier,
      tags.operatorKeyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
      tags.typeName,
      tags.className,
      tags.namespace,
      tags.self,
    ],
    color: syntax.keyword,
  },
  {
    tag: [
      tags.string,
      tags.special(tags.string),
      tags.regexp,
      tags.character,
      tags.escape,
      tags.attributeValue,
    ],
    color: syntax.string,
  },
  {
    tag: [
      tags.number,
      tags.bool,
      tags.null,
      tags.atom,
      tags.unit,
      tags.constant(tags.variableName),
    ],
    color: syntax.number,
  },
  {
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.function(tags.definition(tags.variableName)),
      tags.tagName,
      tags.attributeName,
      tags.macroName,
    ],
    color: syntax.title,
  },
  { tag: tags.comment, color: syntax.comment, fontStyle: "italic" },
])

export const editorHighlighting = syntaxHighlighting(markdownHighlight)
