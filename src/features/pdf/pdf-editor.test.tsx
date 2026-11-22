/// <reference types="node" />
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import {
  createDocumentRegistry,
  MemoryFileService,
  MemorySessionStore,
  WorkspaceProvider,
  WorkspaceView,
} from "@/workspace"

import { pdfDocumentType } from "./document-type"
import {
  closeDocument,
  openDocument,
  readAnnotationTypes,
  readInfo,
  readText,
  setPdfiumWasmSource,
} from "./lib/pdfium"

const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(resolve(process.cwd(), `src/test/fixtures/pdf/${name}`))
  )
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex")

beforeAll(() => {
  setPdfiumWasmSource(async () => {
    const wasm = readFileSync(
      resolve(process.cwd(), "node_modules/@embedpdf/pdfium/dist/pdfium.wasm")
    )
    return wasm.buffer.slice(
      wasm.byteOffset,
      wasm.byteOffset + wasm.byteLength
    ) as ArrayBuffer
  })
})

function renderPdf(files: MemoryFileService) {
  render(
    <TooltipProvider>
      <WorkspaceProvider
        registry={createDocumentRegistry([pdfDocumentType])}
        files={files}
        session={new MemorySessionStore()}
      >
        <WorkspaceView />
      </WorkspaceProvider>
    </TooltipProvider>
  )
}

async function openPdf(name: string, files: MemoryFileService) {
  const user = userEvent.setup()
  files.nextOpenFile = `/n/${name}`
  renderPdf(files)
  await user.click(await screen.findByRole("button", { name: "Open file" }))
  return user
}

const options = () =>
  within(screen.getByRole("listbox", { name: "Pages" }))
    .getAllByRole("option")
    .map((o) => o.getAttribute("aria-label"))

describe("007: PDF editor in the workspace", () => {
  it("AC-015: refuses an encrypted PDF and opens no tab", async () => {
    const files = new MemoryFileService({
      "/n/locked.pdf": fixture("encrypted-owner.pdf"),
    })
    await openPdf("locked.pdf", files)
    expect(
      await screen.findByText(
        /Could not open locked\.pdf: The file is encrypted/
      )
    ).toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
  })

  it("AC-017, AC-018, AC-019: fill, rotate, reorder, and delete by keyboard, then save an edited copy", async () => {
    const source = fixture("form.pdf")
    const before = sha(source)
    const files = new MemoryFileService({ "/n/form.pdf": source })
    const asked: string[] = []
    files.nextSavePath = (name) => {
      asked.push(name)
      return `/n/${name}`
    }
    const user = await openPdf("form.pdf", files)

    const rail = await screen.findByRole("listbox", { name: "Pages" })
    expect(options()).toHaveLength(4)
    expect(
      screen.getByRole("button", { name: "Save Edited Copy" })
    ).toBeInTheDocument()

    // Fill the text field on page 1.
    await user.type(await screen.findByRole("textbox", { name: "name" }), "Ada")
    expect(
      screen.getByRole("tab", { name: "form.pdf, unsaved changes" })
    ).toBeInTheDocument()

    // Page tools from the keyboard: rotate page 1, delete page 4, move page 3 first.
    rail.focus()
    await user.keyboard("r")
    await user.keyboard("{End}{Delete}")
    expect(options()).toHaveLength(3)
    await user.keyboard("{Alt>}{ArrowUp}{ArrowUp}{/Alt}")
    expect(
      await screen.findByText("Page 2 moved to position 1.")
    ).toBeInTheDocument()

    // The last page cannot be deleted.
    await user.keyboard("{Delete}{Delete}{Delete}")
    expect(options()).toHaveLength(1)
    expect(
      await screen.findByText("The last page cannot be deleted.")
    ).toBeInTheDocument()

    // Undo from the File menu brings the two deleted pages back.
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole("button", { name: "File" }))
      await user.click(await screen.findByRole("menuitem", { name: "Undo" }))
    }
    expect(options()).toHaveLength(3)

    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "form (edited).pdf" })
      ).toBeInTheDocument()
    )
    expect(asked).toEqual(["form (edited).pdf"])
    expect(sha(files.bytes.get("/n/form.pdf")!)).toBe(before)

    const copy = await openDocument(files.bytes.get("/n/form (edited).pdf")!)
    try {
      const info = readInfo(copy)
      expect(info.pages.map((p) => p.rotation)).toEqual([0, 1, 0])
      expect(readText(copy, 0)).toContain("PAGE THREE")
      expect(readText(copy, 1)).toContain("PAGE ONE FORM")
      expect(readText(copy, 2)).toContain("PAGE TWO")
      expect(info.fields.find((f) => f.name === "name")?.value).toBe("Ada")
    } finally {
      closeDocument(copy)
    }
  }, 20000)

  it("AC-016: adds, edits, moves, and deletes annotations by keyboard, and saves them on their page", async () => {
    const files = new MemoryFileService({
      "/n/scan.pdf": fixture("scanned.pdf"),
    })
    files.nextSavePath = (name) => `/n/${name}`
    const user = await openPdf("scan.pdf", files)
    const surface = await screen.findByRole("group", { name: "Page 1" })

    // A text box on a scanned page: choose the tool, press Enter, type.
    await user.click(screen.getByRole("button", { name: "Text box" }))
    surface.focus()
    await user.keyboard("{Enter}")
    const editor = await screen.findByRole("textbox", { name: "Text box text" })
    await user.keyboard("Reviewed")
    await user.tab()
    expect(editor).not.toBeInTheDocument()
    const box = screen.getByRole("button", { name: "Text box: Reviewed" })

    // Move it with the keyboard, then edit its text again.
    box.focus()
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}{Enter}")
    await user.keyboard("{Control>}a{/Control}Checked")
    await user.tab()
    expect(
      screen.getByRole("button", { name: "Text box: Checked" })
    ).toBeInTheDocument()

    // A comment, then delete it and undo the delete.
    await user.click(screen.getByRole("button", { name: "Comment" }))
    surface.focus()
    await user.keyboard("{Enter}")
    await screen.findByRole("textbox", { name: "Comment text" })
    await user.keyboard("Look again")
    await user.tab()

    const comment = screen.getByRole("button", { name: "Comment: Look again" })
    comment.focus()
    await user.keyboard("{Delete}")
    expect(
      screen.queryByRole("button", { name: "Comment: Look again" })
    ).not.toBeInTheDocument()
    // Focus returns to the page, so the next key still reaches the editor.
    expect(surface).toHaveFocus()
    expect(await screen.findByText("Comment removed.")).toBeInTheDocument()
    await user.keyboard("{Control>}z{/Control}")
    expect(
      screen.getByRole("button", { name: "Comment: Look again" })
    ).toBeInTheDocument()

    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "scan (edited).pdf" })
      ).toBeInTheDocument()
    )
    const copy = await openDocument(files.bytes.get("/n/scan (edited).pdf")!)
    try {
      // 3 = FreeText (the text box), 1 = Text (the comment).
      expect(readAnnotationTypes(copy, 0).sort()).toEqual([1, 3])
    } finally {
      closeDocument(copy)
    }
  }, 20000)

  it("AC-017: explains an unsupported field and keeps its value", async () => {
    const files = new MemoryFileService({ "/n/form.pdf": fixture("form.pdf") })
    const user = await openPdf("form.pdf", files)
    await user.click(
      await screen.findByRole("button", {
        name: /tags: this kind of field cannot be filled in the editor/,
      })
    )
    expect(
      await screen.findByText(/tags: this kind of field cannot be filled/, {
        selector: "[role=status]",
      })
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "form.pdf" })).toBeInTheDocument()
  })
})
