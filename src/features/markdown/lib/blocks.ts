import { syntaxTree } from "@codemirror/language"
import type { EditorState, Range } from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view"

/** Line classes for block-level Markdown, styled in `theme.ts`. */
export const BLOCK_CLASSES = {
  code: "cm-md-codeblock",
  codeStart: "cm-md-codeblock-start",
  codeEnd: "cm-md-codeblock-end",
  quote: "cm-md-quote",
} as const

const CODE_BLOCKS = new Set(["FencedCode", "CodeBlock"])

/**
 * Line decorations for the visible part of the document: a band behind code
 * blocks (fenced or indented) and a bar beside block quotes. Highlighting
 * styles spans only, so whole-line treatments come from the syntax tree here.
 */
export function blockDecorations(
  state: EditorState,
  ranges: readonly { from: number; to: number }[]
): DecorationSet {
  const lines = new Map<number, Set<string>>()
  const mark = (at: number, name: string) => {
    const set = lines.get(at) ?? new Set<string>()
    set.add(name)
    lines.set(at, set)
  }
  const tree = syntaxTree(state)

  for (const { from, to } of ranges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        const isCode = CODE_BLOCKS.has(node.name)
        const isQuote = node.name === "Blockquote"
        if (!isCode && !isQuote) return
        const first = state.doc.lineAt(node.from)
        const last = state.doc.lineAt(node.to)
        // Only the visible lines: a long block outside the viewport costs nothing.
        const start = Math.max(first.number, state.doc.lineAt(from).number)
        const end = Math.min(last.number, state.doc.lineAt(to).number)
        for (let n = start; n <= end; n++) {
          const line = state.doc.line(n)
          if (isQuote) {
            mark(line.from, BLOCK_CLASSES.quote)
            continue
          }
          mark(line.from, BLOCK_CLASSES.code)
          if (n === first.number) mark(line.from, BLOCK_CLASSES.codeStart)
          if (n === last.number) mark(line.from, BLOCK_CLASSES.codeEnd)
        }
        // Code inside a code block has no Markdown structure to visit.
        if (isCode) return false
      },
    })
  }

  const decorations: Range<Decoration>[] = []
  for (const [at, names] of lines) {
    decorations.push(Decoration.line({ class: [...names].join(" ") }).range(at))
  }
  return Decoration.set(decorations, true)
}

export const markdownBlocks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = blockDecorations(view.state, view.visibleRanges)
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = blockDecorations(
          update.state,
          update.view.visibleRanges
        )
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)
