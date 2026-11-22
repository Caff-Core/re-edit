/// <reference types="node" />
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { beforeAll, describe, expect, it } from "vitest"

import { UnsupportedDocumentError } from "@/lib/unsupported-document"

import { pageId, type PdfOp } from "./model"
import {
  applyEdits,
  closeDocument,
  openDocument,
  readAnnotationTypes,
  readChars,
  readInfo,
  readText,
  setPdfiumWasmSource,
} from "./pdfium"

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

async function reason(bytes: Uint8Array) {
  try {
    closeDocument(await openDocument(bytes))
    return "opened"
  } catch (error) {
    return error instanceof UnsupportedDocumentError ? error.reason : "other"
  }
}

describe("AC-015: opening", () => {
  it("refuses encrypted files, with or without a password", async () => {
    expect(await reason(fixture("encrypted-owner.pdf"))).toBe("encrypted")
    expect(await reason(fixture("encrypted-user.pdf"))).toBe("encrypted")
  })

  it("refuses a damaged file", async () => {
    expect(await reason(new TextEncoder().encode("%PDF-1.7\nnot really"))).toBe(
      "damaged"
    )
  })

  it("reads pages and the standard form fields", async () => {
    const pdf = await openDocument(fixture("form.pdf"))
    try {
      const info = readInfo(pdf)
      expect(info.pages).toHaveLength(4)
      expect(info.pages[0]).toMatchObject({ rotation: 0 })
      const kinds = Object.fromEntries(info.fields.map((f) => [f.name, f.kind]))
      expect(kinds).toEqual({
        name: "text",
        agree: "checkbox",
        color: "radio",
        size: "dropdown",
        tags: "unsupported",
      })
      expect(info.fields.find((f) => f.name === "color")?.widgets).toHaveLength(
        2
      )
      expect(info.fields.find((f) => f.name === "size")?.options).toEqual([
        "S",
        "M",
        "L",
      ])
      expect(readChars(pdf, 1).length).toBeGreaterThan(10)
    } finally {
      closeDocument(pdf)
    }
  })

  it("finds no text layer on a scanned page", async () => {
    const pdf = await openDocument(fixture("scanned.pdf"))
    try {
      expect(readChars(pdf, 0)).toEqual([])
    } finally {
      closeDocument(pdf)
    }
  })
})

describe("AC-019: saving an edited copy", () => {
  it("applies form values, annotations, rotation, deletion, and order, and leaves the source alone", async () => {
    const source = fixture("form.pdf")
    const before = sha(source)
    const pdf = await openDocument(source)
    const info = readInfo(pdf)
    closeDocument(pdf)

    const rect = { left: 72, bottom: 600, right: 200, top: 620 }
    const ops: PdfOp[] = [
      { type: "setField", name: "name", value: { kind: "text", text: "Ada" } },
      {
        type: "setField",
        name: "agree",
        value: { kind: "checked", checked: true },
      },
      {
        type: "setField",
        name: "color",
        value: { kind: "choice", value: "green" },
      },
      { type: "setField", name: "size", value: { kind: "choice", value: "M" } },
      {
        type: "addAnnotation",
        annotation: {
          id: "h1",
          page: pageId(1),
          kind: "highlight",
          rect: { left: 72, bottom: 729, right: 225, top: 742 },
          text: "",
          quads: [{ left: 72, bottom: 729, right: 225, top: 742 }],
        },
      },
      {
        type: "addAnnotation",
        annotation: {
          id: "t1",
          page: pageId(2),
          kind: "textbox",
          rect,
          text: "Box",
          quads: [],
        },
      },
      {
        type: "addAnnotation",
        annotation: {
          id: "c1",
          page: pageId(2),
          kind: "comment",
          rect,
          text: "Note",
          quads: [],
        },
      },
      { type: "rotate", page: pageId(0), turns: 1 },
      { type: "delete", page: pageId(3) },
      { type: "move", page: pageId(2), to: 0 },
    ]
    const out = await applyEdits(source, info, ops)
    expect(sha(source)).toBe(before)

    const copy = await openDocument(out)
    try {
      const reread = readInfo(copy)
      expect(reread.pages.map((p) => p.rotation)).toEqual([0, 1, 0])
      // Each page is identified by its title; extraction order varies on a rotated page.
      const titles = ["PAGE THREE", "PAGE ONE FORM", "PAGE TWO"]
      titles.forEach((title, i) => expect(readText(copy, i)).toContain(title))
      const values = Object.fromEntries(
        reread.fields.map((f) => [
          f.name,
          f.kind === "checkbox" || f.kind === "radio"
            ? f.widgets.filter((w) => w.checked).map((w) => w.exportValue)
            : f.value,
        ])
      )
      expect(values).toMatchObject({
        name: "Ada",
        agree: [expect.any(String)],
        color: ["green"],
        size: "M",
      })
      // 3 = FreeText, 1 = Text (comment), 9 = Highlight; they stayed on their pages.
      expect(readAnnotationTypes(copy, 0).sort()).toEqual([1, 3])
      expect(readAnnotationTypes(copy, 2)).toEqual([9])
    } finally {
      closeDocument(copy)
    }
  })

  it("keeps annotations already in the file", async () => {
    const source = fixture("annotated.pdf")
    const pdf = await openDocument(source)
    const info = readInfo(pdf)
    const existing = readAnnotationTypes(pdf, 0)
    closeDocument(pdf)
    const out = await applyEdits(source, info, [
      { type: "rotate", page: pageId(1), turns: 2 },
    ])
    const copy = await openDocument(out)
    try {
      expect(readAnnotationTypes(copy, 0)).toEqual(existing)
    } finally {
      closeDocument(copy)
    }
  })
})
