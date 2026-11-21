import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EditorView } from "@codemirror/view"
import { describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import { markdownDocumentType } from "@/features/markdown"
import { plainTextDocumentType } from "@/test/fixtures/document-types/plain-text"
import {
  MemoryDocumentStore,
  WorkspaceProvider,
  WorkspaceView,
  createDocumentRegistry,
  type DocumentRef,
} from "@/workspace"

class FailingOnceStore extends MemoryDocumentStore {
  failures = 1
  override async write(document: DocumentRef, content: string) {
    if (this.failures > 0) {
      this.failures--
      throw new Error("Disk is read-only")
    }
    return super.write(document, content)
  }
}

function renderWorkspace(store = new MemoryDocumentStore()) {
  const registry = createDocumentRegistry([
    markdownDocumentType,
    plainTextDocumentType,
  ])
  render(
    <TooltipProvider>
      <WorkspaceProvider registry={registry} store={store}>
        <WorkspaceView />
      </WorkspaceProvider>
    </TooltipProvider>
  )
  return store
}

const tab = (name: string | RegExp) => screen.getByRole("tab", { name })

describe("AC-002: a second document type opens in a tab with its own save and dirty status", () => {
  it("opens, edits, saves, and switches tabs without changing the Markdown module", async () => {
    const user = userEvent.setup()
    const store = renderWorkspace()

    expect(screen.getByText("No document open")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "New Plain text" }))

    const text = await screen.findByRole("textbox", {
      name: "Untitled text, plain text",
    })
    await waitFor(() => expect(text).toHaveFocus())
    expect(tab("Untitled text")).toHaveAttribute("aria-selected", "true")

    await user.type(text, "hello")
    expect(tab("Untitled text, unsaved changes")).toBeInTheDocument()

    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(tab("Untitled text")).toBeInTheDocument())
    expect([...store.saved.values()][0]).toMatchObject({
      document: { typeId: "plain-text", title: "Untitled text" },
      content: "hello",
    })

    // A Markdown document opens beside it with its own dirty state.
    await user.click(screen.getByRole("button", { name: "New document" }))
    await user.click(
      await screen.findByRole("menuitem", { name: "New Markdown document" })
    )
    const markdown = await screen.findByRole("textbox", {
      name: "Untitled, Markdown source",
    })
    const view = EditorView.findFromDOM(markdown)!
    act(() => {
      view.dispatch({
        changes: { from: 0, insert: "# Notes" },
        userEvent: "input.type",
      })
    })
    expect(tab("Untitled, unsaved changes")).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(tab("Untitled text")).toBeInTheDocument()

    // Switching back keeps the plain text buffer and its clean state.
    await user.click(tab("Untitled text"))
    expect(
      screen.getByRole("textbox", { name: "Untitled text, plain text" })
    ).toHaveValue("hello")
    await user.click(tab("Untitled, unsaved changes"))
    expect(view.state.doc.toString()).toBe("# Notes")
  })

  it("asks before closing a dirty tab and honors Cancel and Discard", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole("button", { name: "New Plain text" }))
    await user.type(
      await screen.findByRole("textbox", { name: /plain text/ }),
      "draft"
    )

    await user.click(
      screen.getByRole("button", { name: "Close Untitled text" })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText("Discard changes to Untitled text?")
    ).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole("button", { name: "Keep editing" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(tab("Untitled text, unsaved changes")).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Close Untitled text" })
    )
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Discard and close",
      })
    )
    expect(await screen.findByText("No document open")).toBeInTheDocument()
  })

  it("closes a clean tab without asking", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(
      screen.getByRole("button", { name: "New Markdown document" })
    )
    await user.click(
      await screen.findByRole("button", { name: "Close Untitled" })
    )
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(await screen.findByText("No document open")).toBeInTheDocument()
  })

  it("shows an inline error when a save fails and saves on Retry", async () => {
    const user = userEvent.setup()
    const store = renderWorkspace(new FailingOnceStore())
    await user.click(screen.getByRole("button", { name: "New Plain text" }))
    await user.type(
      await screen.findByRole("textbox", { name: /plain text/ }),
      "keep me"
    )

    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(
      await screen.findByText("Untitled text was not saved")
    ).toBeInTheDocument()
    expect(screen.getByText("Disk is read-only")).toBeInTheDocument()
    expect(tab("Untitled text, unsaved changes")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Retry" }))
    await waitFor(() =>
      expect(
        screen.queryByText("Untitled text was not saved")
      ).not.toBeInTheDocument()
    )
    expect(tab("Untitled text")).toBeInTheDocument()
    expect([...store.saved.values()][0].content).toBe("keep me")
  })
})
