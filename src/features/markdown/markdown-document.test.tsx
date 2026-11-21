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
