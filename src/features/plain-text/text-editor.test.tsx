import { EditorView } from "@codemirror/view"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import {
  createDocumentRegistry,
  MemoryFileService,
  MemorySessionStore,
  WorkspaceProvider,
  WorkspaceView,
} from "@/workspace"

import { plainTextDocumentType } from "./document-type"

const utf8 = (text: string) => [...new TextEncoder().encode(text)]

async function open(files: MemoryFileService, path: string) {
  const user = userEvent.setup()
  files.nextOpenFile = path
  render(
    <TooltipProvider>
      <WorkspaceProvider
        registry={createDocumentRegistry([plainTextDocumentType])}
        files={files}
        session={new MemorySessionStore()}
      >
        <WorkspaceView />
      </WorkspaceProvider>
    </TooltipProvider>
  )
  await user.click(await screen.findByRole("button", { name: "Open file" }))
  return user
}

async function editorView(title: string) {
  const surface = await screen.findByRole("textbox", {
    name: `${title}, plain text`,
  })
  const view = EditorView.findFromDOM(surface)
  if (!view) throw new Error("no CodeMirror view")
  return { surface, view }
}

const append = (view: EditorView, text: string) =>
  act(() => {
    view.dispatch({
      changes: { from: view.state.doc.length, insert: text },
      userEvent: "input.type",
    })
  })

describe("008: plain text", () => {
  it("AC-021: saves non-ASCII text with Windows line endings and its byte order mark unchanged", async () => {
    const original = Uint8Array.from([
      0xef,
      0xbb,
      0xbf,
      ...utf8("Grüße\r\n中文 ✓\r\n"),
    ])
    const files = new MemoryFileService({ "/n/notes.txt": original })
    const user = await open(files, "/n/notes.txt")
    const { view } = await editorView("notes.txt")
    expect(view.state.doc.toString()).toBe("Grüße\n中文 ✓\n")
    expect(screen.getByText("UTF-8 with BOM, CRLF")).toBeInTheDocument()

    append(view, "Ende\n")
    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "notes.txt" })).toBeInTheDocument()
    )
    expect([...files.bytes.get("/n/notes.txt")!]).toEqual([
      0xef,
      0xbb,
      0xbf,
      ...utf8("Grüße\r\n中文 ✓\r\nEnde\r\n"),
    ])
  })

  it("AC-021: says when a file mixes line endings, and refuses an unsupported encoding", async () => {
    const files = new MemoryFileService({
      "/n/mixed.txt": "a\r\nb\r\nc\n",
      "/n/legacy.txt": Uint8Array.from([0x63, 0x61, 0x66, 0xe9]),
    })
    const user = await open(files, "/n/mixed.txt")
    expect(
      await screen.findByText(
        "This file mixes line endings. Saving writes CRLF on every line."
      )
    ).toBeInTheDocument()

    files.nextOpenFile = "/n/legacy.txt"
    await user.click(screen.getByRole("button", { name: "File" }))
    await user.click(await screen.findByRole("menuitem", { name: /Open file/ }))
    expect(
      await screen.findByText(
        /Could not open legacy\.txt: The file uses a text encoding/
      )
    ).toBeInTheDocument()
    expect(screen.getAllByRole("tab")).toHaveLength(1)
  })

  it("AC-020: finds and replaces, undoes, and reads the counts by keyboard", async () => {
    const files = new MemoryFileService({
      "/n/draft.txt": "One apple and one pear.\n",
    })
    const user = await open(files, "/n/draft.txt")
    const { surface, view } = await editorView("draft.txt")
    expect(screen.getByText("5 words, 23 characters")).toBeInTheDocument()

    surface.focus()
    await user.keyboard("{Control>}f{/Control}")
    const find = await screen.findByRole("textbox", { name: "Find" })
    await user.clear(find)
    await user.type(find, "apple")
    await user.type(screen.getByRole("textbox", { name: "Replace" }), "plum")
    await user.click(screen.getByRole("button", { name: /replace all/i }))
    expect(view.state.doc.toString()).toBe("One plum and one pear.\n")
    await user.keyboard("{Escape}")

    // The counts update after a pause and are a Tab stop after the editor.
    await waitFor(() =>
      expect(screen.getByText("5 words, 22 characters")).toBeInTheDocument()
    )
    const status = screen.getByRole("status", { name: "Document status" })
    surface.focus()
    await user.tab()
    expect(status).toHaveFocus()

    // Undo through the File menu.
    await user.click(screen.getByRole("button", { name: "File" }))
    await user.click(await screen.findByRole("menuitem", { name: "Undo" }))
    expect(view.state.doc.toString()).toBe("One apple and one pear.\n")
  })
})
