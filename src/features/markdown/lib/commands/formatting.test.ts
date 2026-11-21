import { EditorSelection, EditorState, type StateCommand } from "@codemirror/state"
import { describe, expect, it } from "vitest"

import { insertLink, toggleHeading, toggleInline } from "./formatting"

function run(command: StateCommand, doc: string, from: number, to = from) {
  let state = EditorState.create({ doc, selection: EditorSelection.single(from, to) })
  command({ state, dispatch: (tr) => (state = tr.state) })
  const { from: a, to: b } = state.selection.main
  return { doc: state.doc.toString(), selected: state.sliceDoc(a, b), cursor: a }
}

describe("toggleInline", () => {
  const bold = toggleInline("**")

  it("wraps a selection and keeps the text selected", () => {
    expect(run(bold, "make this bold", 5, 9)).toMatchObject({
      doc: "make **this** bold",
      selected: "this",
    })
  })

  it("unwraps when the markers surround the selection", () => {
    expect(run(bold, "make **this** bold", 7, 11)).toMatchObject({
      doc: "make this bold",
      selected: "this",
    })
  })

  it("unwraps when the markers are inside the selection", () => {
    expect(run(bold, "make **this** bold", 5, 13).doc).toBe("make this bold")
  })

  it("inserts a marker pair around an empty selection", () => {
    expect(run(bold, "ab", 1)).toMatchObject({ doc: "a****b", cursor: 3 })
  })
})

describe("toggleHeading", () => {
  it("adds, changes, and removes a heading level", () => {
    expect(run(toggleHeading(2), "Title", 0).doc).toBe("## Title")
    expect(run(toggleHeading(1), "## Title", 0).doc).toBe("# Title")
    expect(run(toggleHeading(2), "## Title", 0).doc).toBe("Title")
  })

  it("applies to every selected line", () => {
    expect(run(toggleHeading(3), "one\ntwo", 0, 7).doc).toBe("### one\n### two")
  })
})

describe("insertLink", () => {
  it("links the selection and selects the URL", () => {
    expect(run(insertLink, "see docs here", 4, 8)).toMatchObject({
      doc: "see [docs](https://) here",
      selected: "https://",
    })
  })

  it("inserts placeholder text without a selection", () => {
    expect(run(insertLink, "", 0).doc).toBe("[link text](https://)")
  })
})
