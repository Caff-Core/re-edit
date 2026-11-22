import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { ensureSyntaxTree } from "@codemirror/language"
import { languages } from "@codemirror/language-data"
import { EditorState } from "@codemirror/state"
import { highlightTree, tags, type Tag } from "@lezer/highlight"
import { beforeAll, describe, expect, it } from "vitest"

import { BLOCK_CLASSES, blockDecorations } from "./blocks"
import { markdownHighlight } from "./theme"

function parsed(doc: string) {
  const state = EditorState.create({
    doc,
    extensions: markdown({ base: markdownLanguage, codeLanguages: languages }),
  })
  const tree = ensureSyntaxTree(state, state.doc.length, 5000)
  if (!tree) throw new Error("parse timed out")
  return { state, tree }
}

/** Line number to the classes decorated on it. */
function lineClasses(doc: string) {
  const { state } = parsed(doc)
  const result: Record<number, string[]> = {}
  blockDecorations(state, [{ from: 0, to: state.doc.length }]).between(
    0,
    state.doc.length,
    (from, _to, value) => {
      const n = state.doc.lineAt(from).number
      const names = String(value.spec.class).split(" ").sort()
      result[n] = [...(result[n] ?? []), ...names]
    }
  )
  return result
}

/** The highlight class applied to the first occurrence of `text`. */
function classOf(doc: string, text: string) {
  const { tree } = parsed(doc)
  const at = doc.indexOf(text)
  let found = ""
  highlightTree(tree, markdownHighlight, (from, to, classes) => {
    if (from <= at && at + text.length <= to) found = classes
  })
  return found
}

const styleFor = (tag: Tag) => markdownHighlight.style([tag]) ?? "none"

describe("editor block decorations", () => {
  it("bands fenced and indented code, marking the first and last line", () => {
    const lines = lineClasses(
      ["text", "```js", "let x = 1", "```", "", "    indented"].join("\n")
    )
    expect(lines[1]).toBeUndefined()
    expect(lines[2]).toEqual([BLOCK_CLASSES.code, BLOCK_CLASSES.codeStart])
    expect(lines[3]).toEqual([BLOCK_CLASSES.code])
    expect(lines[4]).toEqual([BLOCK_CLASSES.code, BLOCK_CLASSES.codeEnd])
    expect(lines[6]).toEqual(
      [
        BLOCK_CLASSES.code,
        BLOCK_CLASSES.codeStart,
        BLOCK_CLASSES.codeEnd,
      ].sort()
    )
  })

  it("puts a bar beside each quoted line", () => {
    const lines = lineClasses(["> one", "> two", "", "after"].join("\n"))
    expect(lines[1]).toEqual([BLOCK_CLASSES.quote])
    expect(lines[2]).toEqual([BLOCK_CLASSES.quote])
    expect(lines[4]).toBeUndefined()
  })

  it("only decorates the requested range", () => {
    const doc = ["```", "a", "b", "c", "```"].join("\n")
    const { state } = parsed(doc)
    const third = state.doc.line(3)
    let count = 0
    blockDecorations(state, [{ from: third.from, to: third.to }]).between(
      0,
      doc.length,
      () => {
        count++
      }
    )
    expect(count).toBe(1)
  })
})

describe("editor highlighting", () => {
  beforeAll(async () => {
    // Languages load on first use; load TypeScript up front so the parse is synchronous.
    await languages.find((l) => l.name === "TypeScript")!.load()
    await languages.find((l) => l.name === "Python")!.load()
  })

  const code = [
    "```ts",
    'const greeting: string = "hi" // say hello',
    "let count = 42",
    "```",
  ].join("\n")

  it("colors code inside fenced blocks by language", () => {
    expect(classOf(code, "const")).toContain(styleFor(tags.keyword))
    expect(classOf(code, '"hi"')).toContain(styleFor(tags.string))
    expect(classOf(code, "42")).toContain(styleFor(tags.number))
    expect(classOf(code, "// say hello")).toContain(styleFor(tags.comment))
  })

  it("colors keywords on the first line of a block", () => {
    const python = ["```python", "def area(r):", "    return 3.14 * r", "```"]
    expect(classOf(python.join("\n"), "def")).toContain(styleFor(tags.keyword))
    expect(classOf(python.join("\n"), "return")).toContain(
      styleFor(tags.keyword)
    )
  })

  it("styles Markdown structure and dims its marks", () => {
    const doc = "# Title\n\nSome **bold** and a [link](https://x.y)"
    expect(classOf(doc, "Title")).toContain(styleFor(tags.heading1))
    expect(classOf(doc, "#")).toContain(styleFor(tags.processingInstruction))
    expect(classOf(doc, "bold")).toContain(styleFor(tags.strong))
    expect(classOf(doc, "link")).toContain(styleFor(tags.link))
  })
})
