import { lazy } from "react"

import { defineDocumentType } from "@/workspace"

import { emptyLog, parseDraft, type EditLog } from "./lib/model"
import type { PdfInfo } from "./lib/pdfium"

/** An open PDF: the untouched source, what it holds, and the edits so far. */
export interface PdfDocument {
  source: Uint8Array
  info: PdfInfo
  log: EditLog
}

/** Reads a file with PDFium, refusing encrypted or unreadable ones. */
export async function loadPdf(bytes: Uint8Array): Promise<PdfDocument> {
  // PDFium loads on the first PDF opened, so it stays out of the startup bundle.
  const { openDocument, readInfo, closeDocument } = await import("./lib/pdfium")
  const pdf = await openDocument(bytes)
  try {
    return { source: bytes, info: readInfo(pdf), log: emptyLog }
  } finally {
    closeDocument(pdf)
  }
}

export const pdfDocumentType = defineDocumentType<PdfDocument>({
  id: "pdf",
  label: { en: "PDF document", "zh-CN": "PDF 文档" },
  defaultTitle: { en: "Untitled PDF", "zh-CN": "未命名 PDF" },
  extensions: [".pdf"],
  maxBytes: 200 * 1024 * 1024,
  load: loadPdf,
  // A PDF cannot start empty; it is only opened from a file.
  fromDraft: (draft, saved) => {
    const ops = parseDraft(draft)
    return { ...saved, log: { ops, cursor: ops.length } }
  },
  // The source stays intact: the first save writes an edited copy.
  save: "copy",
  saveLabel: { en: "Save Edited Copy", "zh-CN": "保存编辑副本" },
  Editor: lazy(() =>
    import("./components/pdf-editor").then((module) => ({
      default: module.PdfEditor,
    }))
  ),
})
