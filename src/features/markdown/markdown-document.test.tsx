import { EditorView } from "@codemirror/view"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import { markdownFixture } from "@/test/fixtures"

import { MarkdownDocument } from "./index"

function renderDocument(initialValue = "") {
  render(
    <TooltipProvider>
      <MarkdownDocument name="Untitled" initialValue={initialValue} />
    </TooltipProvider>
  )
  const surface = screen.getByRole("textbox", { name: "Untitled, Markdown source" })
  const view = EditorView.findFromDOM(surface)
  if (!view) throw new Error("CodeMirror view not found")
  return { surface, view }
}

function type(view: EditorView, text: string) {
  const end = view.state.doc.length
  act(() => {
    view.dispatch({
      changes: { from: end, insert: text },
      selection: { anchor: end + text.length },
      userEvent: "input.type",
    })
  })
}

describe("MarkdownDocument", () => {
  it("loads the initial buffer into an accessible editing surface", () => {
    const source = markdownFixture("basic")
    const { surface, view } = renderDocument(source)
    expect(view.state.doc.toString()).toBe(source)
    expect(surface).toHaveAttribute("aria-multiline", "true")
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled()
  })

  it("edits, undoes, and redoes from the toolbar", async () => {
    const user = userEvent.setup()
    const { view } = renderDocument()

    type(view, "# Title")
    expect(view.state.doc.toString()).toBe("# Title")
    const undoButton = screen.getByRole("button", { name: "Undo" })
    expect(undoButton).toBeEnabled()

    await user.click(undoButton)
    expect(view.state.doc.toString()).toBe("")
    expect(undoButton).toBeDisabled()

    const redoButton = screen.getByRole("button", { name: "Redo" })
    expect(redoButton).toBeEnabled()
    await user.click(redoButton)
    expect(view.state.doc.toString()).toBe("# Title")
  })

  it("undoes and redoes with the keyboard", async () => {
    const user = userEvent.setup()
    const { surface, view } = renderDocument()
    type(view, "draft")
    surface.focus()

    await user.keyboard("{Control>}z{/Control}")
    expect(view.state.doc.toString()).toBe("")

    await user.keyboard("{Control>}y{/Control}")
    expect(view.state.doc.toString()).toBe("draft")
  })

  it("leaves Tab unbound so focus can leave the editor", () => {
    const { view } = renderDocument("text")
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })
    view.contentDOM.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(false)
    expect(view.state.doc.toString()).toBe("text")
  })
})

describe("AC-001: format, replace, edit a table, then undo and redo by keyboard", () => {
  it("runs the whole flow on the sample document", async () => {
    const user = userEvent.setup()
    const source = markdownFixture("basic")
    const { surface, view } = renderDocument(source)
    const doc = () => view.state.doc.toString()

    // Format selected text with Ctrl+B.
    const word = source.indexOf("paragraph")
    surface.focus()
    act(() => {
      view.dispatch({ selection: { anchor: word, head: word + "paragraph".length } })
    })
    await user.keyboard("{Control>}b{/Control}")
    expect(doc()).toContain("A **paragraph** with")

    // Replace a term with Ctrl+F and Replace all.
    await user.keyboard("{Control>}f{/Control}")
    const find = await screen.findByRole("textbox", { name: "Find" })
    await user.clear(find)
    await user.type(find, "Bullet")
    await user.type(screen.getByRole("textbox", { name: "Replace" }), "Item")
    await user.click(screen.getByRole("button", { name: /replace all/i }))
    expect(doc()).toContain("- Item one")
    expect(doc()).not.toContain("Bullet")
    await user.keyboard("{Escape}")

    // Edit the table: add a row below "one" with Ctrl+Enter.
    const cell = doc().indexOf("| one")
    act(() => {
      view.dispatch({ selection: { anchor: cell + 2 } })
    })
    view.focus()
    await user.keyboard("{Control>}{Enter}{/Control}")
    const edited = doc()
    expect(edited).toMatch(/\| one\s+\|\s+1 \|\n\|\s+\|\s+\|\n\| two/)
    expect(screen.getByRole("status")).toHaveTextContent("Row added, row 2, column 1")

    // Undo everything with Ctrl+Z, then redo everything with Ctrl+Y.
    const undoButton = screen.getByRole("button", { name: "Undo" })
    for (let i = 0; i < 10 && !undoButton.hasAttribute("disabled"); i++) {
      await user.keyboard("{Control>}z{/Control}")
    }
    expect(doc()).toBe(source)

    const redoButton = screen.getByRole("button", { name: "Redo" })
    for (let i = 0; i < 10 && !redoButton.hasAttribute("disabled"); i++) {
      await user.keyboard("{Control>}y{/Control}")
    }
    expect(doc()).toBe(edited)
  })
})
