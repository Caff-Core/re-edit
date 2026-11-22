import { EditorView } from "@codemirror/view"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import { markdownDocumentType } from "@/features/markdown"
import { plainTextDocumentType } from "@/test/fixtures/document-types/plain-text"
import {
  AUTO_SAVE_DELAY_MS,
  createDocumentRegistry,
  DRAFT_DELAY_MS,
  MemoryFileService,
  MemorySessionStore,
  TREE_LINES_STORAGE_KEY,
  WorkspaceProvider,
  WorkspaceView,
} from "@/workspace"

const registry = createDocumentRegistry([
  markdownDocumentType,
  plainTextDocumentType,
])

function renderWorkspace(
  files = new MemoryFileService(),
  session = new MemorySessionStore(),
  autoSave = false,
  types = registry
) {
  const utils = render(
    <TooltipProvider>
      <WorkspaceProvider
        registry={types}
        files={files}
        session={session}
        autoSave={autoSave}
      >
        <WorkspaceView />
      </WorkspaceProvider>
    </TooltipProvider>
  )
  return { files, session, ...utils }
}

const tab = (name: string | RegExp) => screen.getByRole("tab", { name })

async function markdownView(title: string) {
  const surface = await screen.findByRole("textbox", {
    name: `${title}, Markdown source`,
  })
  const view = EditorView.findFromDOM(surface)
  if (!view) throw new Error("no CodeMirror view")
  return view
}

function typeInto(view: EditorView, text: string) {
  act(() => {
    view.dispatch({
      changes: { from: view.state.doc.length, insert: text },
      userEvent: "input.type",
    })
  })
}

const waitForDraft = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, DRAFT_DELAY_MS + 50)))

describe("AC-002: a second document type opens in a tab with its own save and dirty status", () => {
  it("opens, edits, saves with Save As, and switches tabs without changing the Markdown module", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService()
    files.nextSavePath = (name) => `/docs/${name}`
    renderWorkspace(files)

    await user.click(
      await screen.findByRole("button", { name: "New Plain text" })
    )
    const text = await screen.findByRole("textbox", {
      name: "Untitled text, plain text",
    })
    await waitFor(() => expect(text).toHaveFocus())
    await user.type(text, "hello")
    expect(tab("Untitled text, unsaved changes")).toBeInTheDocument()

    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(tab("Untitled text.txt")).toBeInTheDocument())
    expect(files.files.get("/docs/Untitled text.txt")).toBe("hello")

    await user.click(screen.getByRole("button", { name: "File" }))
    await user.click(
      await screen.findByRole("menuitem", { name: /New Markdown document/ })
    )
    const view = await markdownView("Untitled")
    typeInto(view, "# Notes")
    expect(tab("Untitled, unsaved changes")).toHaveAttribute(
      "aria-selected",
      "true"
    )

    await user.click(tab("Untitled text.txt"))
    expect(
      screen.getByRole("textbox", { name: "Untitled text.txt, plain text" })
    ).toHaveValue("hello")
    await user.click(tab("Untitled, unsaved changes"))
    expect(view.state.doc.toString()).toBe("# Notes")
  })

  it("asks before closing a dirty tab and honors Cancel and Discard", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(
      await screen.findByRole("button", { name: "New Plain text" })
    )
    await user.type(
      await screen.findByRole("textbox", { name: /plain text/ }),
      "draft"
    )

    await user.click(
      screen.getByRole("button", { name: "Close Untitled text" })
    )
    const dialog = await screen.findByRole("alertdialog")
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

  it("shows an inline error when a save fails and saves on Retry", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/docs/a.txt": "" })
    files.nextOpenFile = "/docs/a.txt"
    files.failWrites = 1
    renderWorkspace(files)
    await user.click(await screen.findByRole("button", { name: "Open file" }))
    await user.type(
      await screen.findByRole("textbox", { name: "a.txt, plain text" }),
      "keep me"
    )

    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("a.txt was not saved")).toBeInTheDocument()
    expect(
      screen.getByText(
        "The file could not be read or written (/docs/a.txt: permission denied)."
      )
    ).toBeInTheDocument()
    expect(tab("a.txt, unsaved changes")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Retry" }))
    await waitFor(() =>
      expect(screen.queryByText("a.txt was not saved")).not.toBeInTheDocument()
    )
    expect(tab("a.txt")).toBeInTheDocument()
    expect(files.files.get("/docs/a.txt")).toBe("keep me")
  })
})

describe("AC-005: open a folder, edit two files, switch tabs, cancel a close, restore drafts", () => {
  it("restores both drafts after a restart", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({
      "/notes/a.md": "# A",
      "/notes/b.md": "# B",
      "/notes/sub/c.md": "# C",
      "/notes/image.png": "binary",
    })
    files.nextFolder = "/notes"
    const first = renderWorkspace(files)

    await user.click(await screen.findByRole("button", { name: "Open folder" }))
    const panel = await screen.findByRole("complementary", {
      name: "Folder notes",
    })
    const tree = within(panel)
    expect(await tree.findByText("sub")).toBeInTheDocument()
    expect(tree.queryByText("image.png")).not.toBeInTheDocument()

    await user.click(tree.getByText("a.md"))
    const a = await markdownView("a.md")
    await user.click(tree.getByText("b.md"))
    const b = await markdownView("b.md")
    expect(a.state.doc.toString()).toBe("# A")

    typeInto(b, " edited")
    await user.click(tab("a.md"))
    typeInto(a, " changed")
    expect(tab("a.md, unsaved changes")).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(tab("b.md, unsaved changes")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close a.md" }))
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Keep editing",
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )

    await waitForDraft()
    expect(
      first.session.session?.documents.map((d) => [d.title, d.draft])
    ).toEqual([
      ["a.md", "# A changed"],
      ["b.md", "# B edited"],
    ])
    expect(first.session.session?.folder).toBe("/notes")

    // Restart: a new workspace over the same disk and stored session.
    first.unmount()
    renderWorkspace(files, first.session)

    expect(
      await screen.findByRole("tab", { name: "a.md, unsaved changes" })
    ).toBeInTheDocument()
    expect(tab("b.md, unsaved changes")).toBeInTheDocument()
    expect((await markdownView("a.md")).state.doc.toString()).toBe(
      "# A changed"
    )
    await user.click(tab("b.md, unsaved changes"))
    expect((await markdownView("b.md")).state.doc.toString()).toBe("# B edited")
    expect(
      await screen.findByRole("complementary", { name: "Folder notes" })
    ).toBeInTheDocument()
    expect(files.files.get("/notes/a.md")).toBe("# A")
  })

  it("saves to the file, clears the draft, and remembers recent files and folders", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/notes/a.md": "# A" })
    files.nextFolder = "/notes"
    const { session } = renderWorkspace(files)

    await user.click(await screen.findByRole("button", { name: "Open folder" }))
    await user.click(await screen.findByText("a.md"))
    typeInto(await markdownView("a.md"), "!")
    await waitForDraft()
    expect(session.session?.documents[0].draft).toBe("# A!")

    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(tab("a.md")).toBeInTheDocument())
    expect(files.files.get("/notes/a.md")).toBe("# A!")
    expect(session.session?.documents[0].draft).toBeNull()
    expect(session.recents).toEqual([
      { path: "/notes/a.md", kind: "file" },
      { path: "/notes", kind: "folder" },
    ])
  })

  it("reports files that cannot be reopened and keeps the rest", async () => {
    const session = new MemorySessionStore()
    session.session = {
      documents: [
        {
          id: "doc-7",
          typeId: "markdown",
          title: "gone.md",
          path: "/gone.md",
          draft: null,
          baseModifiedMs: null,
          copyPending: false,
        },
        {
          id: "doc-8",
          typeId: "markdown",
          title: "kept.md",
          path: "/kept.md",
          draft: null,
          baseModifiedMs: null,
          copyPending: false,
        },
      ],
      activeId: "doc-8",
      folder: null,
    }
    renderWorkspace(new MemoryFileService({ "/kept.md": "# Kept" }), session)
    expect(
      await screen.findByText(/Could not reopen gone.md/)
    ).toBeInTheDocument()
    expect(await screen.findByRole("tab", { name: "kept.md" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })

  it("focuses the existing tab instead of opening a file twice", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    files.nextOpenFile = "/n/a.md"
    renderWorkspace(files)
    await user.click(await screen.findByRole("button", { name: "Open file" }))
    await screen.findByRole("tab", { name: "a.md" })
    await user.keyboard("{Control>}o{/Control}")
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(1))
  })
})

describe("002.01: images next to an opened file", () => {
  it("loads sibling images through the workspace and refuses escapes", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({
      "/notes/a.md": "![Dot](img/dot.png) ![Escape](../secret.png)",
      "/notes/img/dot.png": "iVBORw==",
      "/secret.png": "c2VjcmV0",
    })
    files.nextOpenFile = "/notes/a.md"
    renderWorkspace(files)
    await user.click(await screen.findByRole("button", { name: "Open file" }))
    await markdownView("a.md")
    await user.click(screen.getByRole("button", { name: "Preview" }))
    expect(await screen.findByRole("img", { name: "Dot" })).toHaveAttribute(
      "src",
      "data:image/png;base64,iVBORw=="
    )
    expect(
      await screen.findByRole("img", {
        name: "Escape: ../secret.png is outside the document's folder",
      })
    ).toBeInTheDocument()
  })
})

describe("AC-006: changes on disk keep both versions; failed writes keep the buffer", () => {
  async function openA(files: MemoryFileService) {
    files.nextOpenFile = "/n/a.md"
    renderWorkspace(files)
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Open file" }))
    return markdownView("a.md")
  }

  it("AC-014: turns a dirty tab into a conflict and saves mine as a copy, keeping both versions", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    files.nextSavePath = "/n/a mine.md"
    const view = await openA(files)
    typeInto(view, " mine")

    act(() => files.externalWrite("/n/a.md", "# A theirs"))
    expect(await screen.findByText("a.md changed on disk")).toBeInTheDocument()
    expect(view.state.doc.toString()).toBe("# A mine")

    await user.click(screen.getByRole("button", { name: "Save a copy…" }))
    await waitFor(() =>
      expect(screen.queryByText("a.md changed on disk")).not.toBeInTheDocument()
    )
    expect(files.files.get("/n/a mine.md")).toBe("# A mine")
    expect(files.files.get("/n/a.md")).toBe("# A theirs")
    expect(tab("a mine.md")).toBeInTheDocument()
  })

  it("AC-014: Keep editing dismisses the conflict, and the next save asks again", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openA(files)
    typeInto(view, " mine")
    act(() => files.externalWrite("/n/a.md", "# A theirs"))
    await user.click(
      await screen.findByRole("button", { name: "Keep editing" })
    )
    expect(screen.queryByText("a.md changed on disk")).not.toBeInTheDocument()
    typeInto(view, " more")
    await user.keyboard("{Control>}s{/Control}")
    expect(await screen.findByText("a.md changed on disk")).toBeInTheDocument()
    expect(files.files.get("/n/a.md")).toBe("# A theirs")
  })

  it("reloads a clean tab that changed on disk and says so", async () => {
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openA(files)
    act(() => files.externalWrite("/n/a.md", "# A updated"))
    expect(
      await screen.findByText("Reloaded a.md because it changed on disk.")
    ).toBeInTheDocument()
    expect(view.state.doc.toString()).toBe("# A updated")
    expect(tab("a.md")).toBeInTheDocument()
  })

  it("AC-014: reloads the disk version after confirmation, as an undoable change", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openA(files)
    typeInto(view, " mine")
    act(() => files.externalWrite("/n/a.md", "# A theirs"))
    await user.click(await screen.findByRole("button", { name: "Reload…" }))
    const confirm = await screen.findByRole("alertdialog")
    await user.click(
      within(confirm).getByRole("button", { name: "Keep editing" })
    )
    expect(view.state.doc.toString()).toBe("# A mine")

    await user.click(screen.getByRole("button", { name: "Reload…" }))
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Reload",
      })
    )
    expect(view.state.doc.toString()).toBe("# A theirs")
    await waitFor(() => expect(tab("a.md")).toBeInTheDocument())

    view.focus()
    await user.keyboard("{Control>}z{/Control}")
    expect(view.state.doc.toString()).toBe("# A mine")
    expect(tab("a.md, unsaved changes")).toBeInTheDocument()
  })

  it("refuses to save over a newer disk version even without a change event", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openA(files)
    typeInto(view, " mine")
    // Another program writes while the watcher is not looking.
    files.files.set("/n/a.md", "# A theirs")
    files.modified.set("/n/a.md", 99)

    await user.keyboard("{Control>}s{/Control}")
    expect(await screen.findByText("a.md changed on disk")).toBeInTheDocument()
    expect(files.files.get("/n/a.md")).toBe("# A theirs")
    expect(view.state.doc.toString()).toBe("# A mine")
  })

  it("does not treat the app's own saves as changes on disk", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openA(files)
    typeInto(view, "!")
    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(tab("a.md")).toBeInTheDocument())
    typeInto(view, "?")
    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(files.files.get("/n/a.md")).toBe("# A!?"))
    expect(screen.queryByText(/changed on disk/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Reloaded/)).not.toBeInTheDocument()
  })

  it("keeps the text of a file deleted on disk and can write it again", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openA(files)
    typeInto(view, " kept")
    act(() => files.externalWrite("/n/a.md", null))
    expect(
      await screen.findByText("a.md was deleted on disk")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Reload…" })
    ).not.toBeInTheDocument()
    files.nextSavePath = "/n/a.md"
    await user.click(screen.getByRole("button", { name: "Save a copy…" }))
    await waitFor(() => expect(files.files.get("/n/a.md")).toBe("# A kept"))
    expect(
      screen.queryByText("a.md was deleted on disk")
    ).not.toBeInTheDocument()
  })
})

describe("AC-010/AC-011 base: export to HTML and PDF", () => {
  async function newMarkdown(files: MemoryFileService) {
    const user = userEvent.setup()
    renderWorkspace(files)
    await user.click(
      await screen.findByRole("button", { name: "New Markdown document" })
    )
    const view = await markdownView("Untitled")
    typeInto(view, "# Report\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n$x^2$\n")
    return { user, view }
  }

  async function exportAs(
    user: ReturnType<typeof userEvent.setup>,
    item: string
  ) {
    await user.click(screen.getByRole("button", { name: "File" }))
    await user.click(await screen.findByRole("menuitem", { name: item }))
  }

  it("exports an unsaved buffer as standalone HTML", async () => {
    const files = new MemoryFileService()
    files.nextExportPath = "/out/report"
    const { user } = await newMarkdown(files)

    await exportAs(user, "Export as HTML…")
    expect(await screen.findByText("Exported report.html.")).toBeInTheDocument()
    const html = files.files.get("/out/report.html") ?? ""
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain("<title>Untitled</title>")
    expect(html).toContain("Content-Security-Policy")
    expect(html).toContain("<h1>Report</h1>")
    expect(html).toContain("<table>")
    expect(html).toContain("<math")
    expect(html).not.toContain("<script")
    // The buffer stays unsaved; exporting is not saving.
    expect(tab("Untitled, unsaved changes")).toBeInTheDocument()
  })

  it("exports the same document to PDF without touching the buffer", async () => {
    const files = new MemoryFileService()
    files.nextExportPath = "/out/report.pdf"
    const { user, view } = await newMarkdown(files)

    await exportAs(user, "Export as PDF…")
    expect(await screen.findByText("Exported report.pdf.")).toBeInTheDocument()
    expect(files.pdfs.get("/out/report.pdf")).toContain("<h1>Report</h1>")
    expect(view.state.doc.toString()).toContain("# Report")
  })

  it("changes nothing when the destination chooser is cancelled", async () => {
    const files = new MemoryFileService()
    files.nextExportPath = null
    const { user } = await newMarkdown(files)

    await exportAs(user, "Export as PDF…")
    expect(files.pdfs.size).toBe(0)
    expect(files.files.size).toBe(0)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("reports a renderer failure and keeps the destination and buffer", async () => {
    const files = new MemoryFileService()
    files.files.set("/out/report.pdf", "previous export")
    files.nextExportPath = "/out/report.pdf"
    files.failExports = 1
    const { user, view } = await newMarkdown(files)

    await exportAs(user, "Export as PDF…")
    expect(
      await screen.findByText(
        "Could not export report.pdf: The PDF could not be rendered (the renderer exited with 1). The destination was not changed."
      )
    ).toBeInTheDocument()
    expect(files.files.get("/out/report.pdf")).toBe("previous export")
    expect(files.pdfs.size).toBe(0)
    expect(view.state.doc.toString()).toContain("# Report")
  })
})

describe("AC-010: export embeds images next to a saved document", () => {
  it("inlines sibling images and notes the ones it cannot include", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({
      "/notes/a.md": "![Dot](img/dot.png) ![Escape](../secret.png)",
      "/notes/img/dot.png": "iVBORw==",
      "/secret.png": "c2VjcmV0",
    })
    files.nextOpenFile = "/notes/a.md"
    files.nextExportPath = "/out/a.html"
    renderWorkspace(files)
    await user.click(await screen.findByRole("button", { name: "Open file" }))
    await markdownView("a.md")

    await user.click(screen.getByRole("button", { name: "File" }))
    await user.click(
      await screen.findByRole("menuitem", { name: "Export as HTML…" })
    )
    expect(await screen.findByText("Exported a.html.")).toBeInTheDocument()
    const html = files.files.get("/out/a.html") ?? ""
    expect(html).toContain(
      '<img src="data:image/png;base64,iVBORw==" alt="Dot">'
    )
    expect(html).toContain("../secret.png could not be included.")
    expect(html).not.toContain("c2VjcmV0")
  })
})

describe("003.04: auto save", () => {
  const waitForAutoSave = () =>
    act(
      () =>
        new Promise((resolve) => setTimeout(resolve, AUTO_SAVE_DELAY_MS + 100))
    )

  async function openWith(files: MemoryFileService, autoSave: boolean) {
    files.nextOpenFile = "/n/a.md"
    renderWorkspace(files, new MemorySessionStore(), autoSave)
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Open file" }))
    return markdownView("a.md")
  }

  it("writes an opened file shortly after the last edit", async () => {
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openWith(files, true)
    typeInto(view, " one")
    typeInto(view, " two")
    expect(files.files.get("/n/a.md")).toBe("# A")
    await waitForAutoSave()
    expect(files.files.get("/n/a.md")).toBe("# A one two")
    expect(tab("a.md")).toBeInTheDocument()
  })

  it("writes nothing while the setting is off", async () => {
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openWith(files, false)
    typeInto(view, " edit")
    await waitForAutoSave()
    expect(files.files.get("/n/a.md")).toBe("# A")
    expect(tab("a.md, unsaved changes")).toBeInTheDocument()
  })

  it("never overwrites a file changed elsewhere", async () => {
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    const view = await openWith(files, true)
    typeInto(view, " mine")
    // The file changes elsewhere before the pending auto save fires.
    act(() => files.externalWrite("/n/a.md", "# Theirs"))
    await waitForAutoSave()
    expect(files.files.get("/n/a.md")).toBe("# Theirs")
    expect(await screen.findByText("a.md changed on disk")).toBeInTheDocument()
    typeInto(view, " more")
    await waitForAutoSave()
    expect(files.files.get("/n/a.md")).toBe("# Theirs")
  })

  it("stops after a failed write until the user retries", async () => {
    const files = new MemoryFileService({ "/n/a.md": "# A" })
    files.failWrites = 5
    const view = await openWith(files, true)
    typeInto(view, " x")
    await waitForAutoSave()
    expect(await screen.findByText("a.md was not saved")).toBeInTheDocument()
    expect(files.failWrites).toBe(4)
    typeInto(view, " y")
    await waitForAutoSave()
    expect(files.failWrites).toBe(4)
  })

  it("leaves untitled documents to draft recovery", async () => {
    const files = new MemoryFileService()
    let asked = 0
    files.nextSavePath = () => {
      asked++
      return null
    }
    const user = userEvent.setup()
    renderWorkspace(files, new MemorySessionStore(), true)
    await user.click(
      await screen.findByRole("button", { name: "New Markdown document" })
    )
    typeInto(await markdownView("Untitled"), "draft")
    await waitForAutoSave()
    expect(asked).toBe(0)
    expect(tab("Untitled, unsaved changes")).toBeInTheDocument()
  })
})

describe("003.05: folder tree branch lines", () => {
  async function openNotes() {
    const user = userEvent.setup()
    const files = new MemoryFileService({
      "/notes/a.md": "# A",
      "/notes/sub/c.md": "# C",
    })
    files.nextFolder = "/notes"
    renderWorkspace(files)
    await user.click(await screen.findByRole("button", { name: "Open folder" }))
    const panel = await screen.findByRole("complementary", {
      name: "Folder notes",
    })
    // The tree is announced by name (ReUI's Tree used to drop the label).
    return within(panel).findByRole("tree", { name: "Files in notes" })
  }

  it("shows branch lines by default", async () => {
    localStorage.removeItem(TREE_LINES_STORAGE_KEY)
    expect(await openNotes()).toHaveAttribute("data-lines", "true")
  })

  it("hides them when the setting is off", async () => {
    localStorage.setItem(TREE_LINES_STORAGE_KEY, "false")
    expect(await openNotes()).not.toHaveAttribute("data-lines")
    localStorage.removeItem(TREE_LINES_STORAGE_KEY)
  })
})

describe("tab close commands", () => {
  async function openPlain(
    user: ReturnType<typeof userEvent.setup>,
    n: number
  ) {
    const empty = screen.queryByRole("button", { name: "New Plain text" })
    if (empty) await user.click(empty)
    for (let i = empty ? 1 : 0; i < n; i++) {
      await user.click(screen.getByRole("button", { name: "File" }))
      await user.click(
        await screen.findByRole("menuitem", { name: /New Plain text/ })
      )
    }
  }

  const titles = () => screen.getAllByRole("tab").map((t) => t.textContent)

  async function runOn(
    user: ReturnType<typeof userEvent.setup>,
    name: string | RegExp,
    command: string
  ) {
    await user.pointer({ keys: "[MouseRight]", target: tab(name) })
    await user.click(await screen.findByRole("menuitem", { name: command }))
  }

  it("closes to the right, to the left, others, and all", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await screen.findByRole("button", { name: "New Plain text" })
    await openPlain(user, 4)
    expect(titles()).toEqual([
      "Untitled text",
      "Untitled text 2",
      "Untitled text 3",
      "Untitled text 4",
    ])

    await runOn(user, "Untitled text 2", "Close to the right")
    expect(titles()).toEqual(["Untitled text", "Untitled text 2"])
    expect(tab("Untitled text 2")).toHaveAttribute("aria-selected", "true")

    await runOn(user, "Untitled text 2", "Close to the left")
    expect(titles()).toEqual(["Untitled text 2"])

    await user.pointer({ keys: "[MouseRight]", target: tab("Untitled text 2") })
    for (const command of [
      "Close others",
      "Close to the left",
      "Close to the right",
    ]) {
      expect(
        await screen.findByRole("menuitem", { name: command })
      ).toHaveAttribute("aria-disabled", "true")
    }
    await user.keyboard("{Escape}")

    await openPlain(user, 1)
    await runOn(user, "Untitled text 2", "Close others")
    expect(titles()).toEqual(["Untitled text 2"])

    await runOn(user, "Untitled text 2", "Close all")
    expect(await screen.findByText("No document open")).toBeInTheDocument()
  })

  it("asks once before closing several unsaved tabs", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await screen.findByRole("button", { name: "New Plain text" })
    await openPlain(user, 3)
    for (const title of ["Untitled text", "Untitled text 2"]) {
      await user.click(tab(title))
      await user.type(
        await screen.findByRole("textbox", { name: `${title}, plain text` }),
        "x"
      )
    }

    await runOn(user, /^Untitled text 3/, "Close all")
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText("Discard changes to 2 documents?")
    ).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole("button", { name: "Keep editing" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(screen.getAllByRole("tab")).toHaveLength(3)

    await runOn(user, /^Untitled text 3/, "Close all")
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Discard and close",
      })
    )
    expect(await screen.findByText("No document open")).toBeInTheDocument()
  })
})

describe("006: shared document workspace", () => {
  const bom = [0xef, 0xbb, 0xbf]
  const utf8 = (text: string) => [...new TextEncoder().encode(text)]

  it("AC-012: saves a UTF-8 file with a byte order mark and Windows line endings byte for byte", async () => {
    const user = userEvent.setup()
    const original = Uint8Array.from([
      ...bom,
      ...utf8("# Título\r\n\r\nUno\r\n"),
    ])
    const files = new MemoryFileService({ "/n/a.md": original })
    files.nextOpenFile = "/n/a.md"
    renderWorkspace(files)
    await user.click(await screen.findByRole("button", { name: "Open file" }))
    const view = await markdownView("a.md")
    expect(view.state.doc.toString()).toBe("# Título\n\nUno\n")

    typeInto(view, "Dos\n")
    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(tab("a.md")).toBeInTheDocument())
    expect([...files.bytes.get("/n/a.md")!]).toEqual([
      ...bom,
      ...utf8("# Título\r\n\r\nUno\r\nDos\r\n"),
    ])
  })

  it("AC-012: refuses a Windows-1252 file and opens no tab", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({
      "/n/legacy.txt": Uint8Array.from([0x63, 0x61, 0x66, 0xe9]),
    })
    files.nextOpenFile = "/n/legacy.txt"
    renderWorkspace(files)
    await user.click(await screen.findByRole("button", { name: "Open file" }))
    expect(
      await screen.findByText(
        /Could not open legacy\.txt: The file uses a text encoding the editor cannot keep intact/
      )
    ).toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
    expect([...files.bytes.get("/n/legacy.txt")!]).toEqual([
      0x63, 0x61, 0x66, 0xe9,
    ])
  })

  it("AC-013: two document types keep their own content, undo, and dirty state, and save only the active file", async () => {
    const user = userEvent.setup()
    const files = new MemoryFileService({ "/n/a.md": "# A", "/n/b.txt": "b" })
    renderWorkspace(files)
    files.nextOpenFile = "/n/a.md"
    await user.click(await screen.findByRole("button", { name: "Open file" }))
    const markdown = await markdownView("a.md")
    files.nextOpenFile = "/n/b.txt"
    await user.click(screen.getByRole("button", { name: "File" }))
    await user.click(await screen.findByRole("menuitem", { name: /Open file/ }))
    const text = await screen.findByRole("textbox", {
      name: "b.txt, plain text",
    })

    await user.type(text, "!")
    await user.click(tab("a.md"))
    typeInto(markdown, " edited")
    expect(tab("a.md, unsaved changes")).toBeInTheDocument()
    expect(tab("b.txt, unsaved changes")).toBeInTheDocument()

    // Undo from the File menu reaches only the active document.
    await user.click(tab("b.txt, unsaved changes"))
    await user.click(screen.getByRole("button", { name: "File" }))
    await user.click(await screen.findByRole("menuitem", { name: "Undo" }))
    expect(text).toHaveValue("b")
    expect(markdown.state.doc.toString()).toBe("# A edited")
    await waitFor(() => expect(tab("b.txt")).toBeInTheDocument())
    expect(tab("a.md, unsaved changes")).toBeInTheDocument()

    // Saving the active tab writes only its file.
    await user.click(tab("a.md, unsaved changes"))
    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(files.files.get("/n/a.md")).toBe("# A edited"))
    expect(files.files.get("/n/b.txt")).toBe("b")
  })

  it("AC-013: the File menu offers only the commands the active document supports", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(
      await screen.findByRole("button", { name: "New Plain text" })
    )
    await screen.findByRole("textbox", { name: /plain text/ })
    await user.click(screen.getByRole("button", { name: "File" }))
    expect(
      await screen.findByRole("menuitem", { name: "Undo" })
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      screen.queryByRole("menuitem", { name: "Find" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("menuitem", { name: "Format document" })
    ).not.toBeInTheDocument()
  })

  it("AC-014: restores drafts of both types, and a draft whose file changed comes back as a conflict", async () => {
    const files = new MemoryFileService({ "/n/a.md": "# A", "/n/b.txt": "b" })
    const session = new MemorySessionStore()
    session.session = {
      documents: [
        {
          id: "doc-1",
          typeId: "markdown",
          title: "a.md",
          path: "/n/a.md",
          draft: "# A draft",
          baseModifiedMs: 1,
          copyPending: false,
        },
        {
          id: "doc-2",
          typeId: "plain-text",
          title: "b.txt",
          path: "/n/b.txt",
          draft: "b draft",
          baseModifiedMs: 0,
          copyPending: false,
        },
      ],
      activeId: "doc-1",
      folder: null,
    }
    renderWorkspace(files, session)
    const markdown = await markdownView("a.md")
    expect(markdown.state.doc.toString()).toBe("# A draft")
    expect(tab("a.md, unsaved changes")).toBeInTheDocument()
    // b.txt was saved by someone else since the draft (version 1, not 0).
    expect(await screen.findByText("b.txt changed on disk")).toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: "b.txt, plain text", hidden: true })
    ).toHaveValue("b draft")
    expect(files.files.get("/n/b.txt")).toBe("b")
  })

  it("AC-014: a copy-mode type saves an edited copy and leaves the source untouched", async () => {
    const user = userEvent.setup()
    const copyText = {
      ...plainTextDocumentType,
      id: "copy-text",
      extensions: [".ctxt"],
      save: "copy" as const,
      saveLabel: { en: "Save Edited Copy", "zh-CN": "保存编辑副本" },
    }
    const files = new MemoryFileService({ "/n/report.ctxt": "v1" })
    const asked: string[] = []
    files.nextSavePath = (name) => {
      asked.push(name)
      return `/n/${name}`
    }
    files.nextOpenFile = "/n/report.ctxt"
    renderWorkspace(
      files,
      new MemorySessionStore(),
      false,
      createDocumentRegistry([copyText])
    )
    await user.click(await screen.findByRole("button", { name: "Open file" }))
    const text = await screen.findByRole("textbox", {
      name: "report.ctxt, plain text",
    })
    expect(
      screen.getByRole("button", { name: "Save Edited Copy" })
    ).toBeInTheDocument()

    await user.type(text, " edited")
    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(tab("report (edited).ctxt")).toBeInTheDocument())
    expect(asked).toEqual(["report (edited).ctxt"])
    expect(files.files.get("/n/report (edited).ctxt")).toBe("v1 edited")
    expect(files.files.get("/n/report.ctxt")).toBe("v1")

    // From now on the tab follows the copy and saves it in place.
    await user.type(text, "!")
    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() =>
      expect(files.files.get("/n/report (edited).ctxt")).toBe("v1 edited!")
    )
    expect(asked).toHaveLength(1)
  })

  it("AC-014: a cancelled save keeps the edits", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(
      await screen.findByRole("button", { name: "New Plain text" })
    )
    const text = await screen.findByRole("textbox", { name: /plain text/ })
    await user.type(text, "keep me")
    await user.keyboard("{Control>}s{/Control}")
    expect(text).toHaveValue("keep me")
    expect(tab("Untitled text, unsaved changes")).toBeInTheDocument()
  })
})
