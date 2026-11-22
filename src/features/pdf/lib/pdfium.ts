import { init, type WrappedPdfiumModule } from "@embedpdf/pdfium"
import wasmUrl from "@embedpdf/pdfium/pdfium.wasm?url"

import { UnsupportedDocumentError } from "@/lib/unsupported-document"

import {
  derive,
  sourceIndex,
  type EditorAnnotation,
  type FieldValue,
  type PageChar,
  type PdfOp,
  type Rect,
} from "./model"

/**
 * The only module that talks to PDFium (EmbedPDF's WebAssembly build, chosen
 * in the 007.01 spike). It opens files, reads what the editor shows, renders
 * pages, and replays the edit log onto a fresh copy of the source to save.
 */

type Pdfium = WrappedPdfiumModule

let loadWasm: () => Promise<ArrayBuffer> = async () =>
  (await fetch(wasmUrl)).arrayBuffer()
let instance: Promise<Pdfium> | null = null

/** Tests load the WebAssembly from disk instead of fetching it. */
export function setPdfiumWasmSource(load: () => Promise<ArrayBuffer>) {
  loadWasm = load
  instance = null
}

/** Starts PDFium once, on the first PDF opened. */
export function pdfium(): Promise<Pdfium> {
  instance ??= loadWasm().then(async (wasmBinary) => {
    const module = await init({ wasmBinary })
    module.PDFiumExt_Init()
    return module
  })
  return instance
}

// --- memory helpers ---------------------------------------------------------

function withWString<T>(m: Pdfium, value: string, fn: (ptr: number) => T) {
  const length = (value.length + 1) * 2
  const ptr = m.pdfium._malloc(length)
  try {
    m.pdfium.stringToUTF16(value, ptr, length)
    return fn(ptr)
  } finally {
    m.pdfium._free(ptr)
  }
}

function withFloats<T>(m: Pdfium, values: number[], fn: (ptr: number) => T) {
  const ptr = m.pdfium._malloc(values.length * 4)
  values.forEach((v, i) => m.pdfium.setValue(ptr + i * 4, v, "float"))
  try {
    return fn(ptr)
  } finally {
    m.pdfium._free(ptr)
  }
}

/** Calls a PDFium "write UTF-16 into this buffer" function twice: size, then text. */
function readWString(m: Pdfium, call: (ptr: number, size: number) => number) {
  const size = call(0, 0)
  if (size <= 2) return ""
  const ptr = m.pdfium._malloc(size)
  try {
    call(ptr, size)
    return m.pdfium.UTF16ToString(ptr)
  } finally {
    m.pdfium._free(ptr)
  }
}

function readRect(m: Pdfium, annot: number): Rect {
  const ptr = m.pdfium._malloc(16)
  try {
    m.FPDFAnnot_GetRect(annot, ptr)
    const [left, top, right, bottom] = [0, 4, 8, 12].map((o) =>
      m.pdfium.getValue(ptr + o, "float")
    )
    return {
      left: Math.min(left, right),
      right: Math.max(left, right),
      bottom: Math.min(top, bottom),
      top: Math.max(top, bottom),
    }
  } finally {
    m.pdfium._free(ptr)
  }
}

// --- opening ----------------------------------------------------------------

/** An open PDFium document. Close it with `closeDocument`. */
export interface OpenPdf {
  m: Pdfium
  doc: number
  filePtr: number
}

const FPDF_ERR_FORMAT = 3
const FPDF_ERR_PASSWORD = 4
const FPDF_ERR_SECURITY = 5

/**
 * Opens `bytes`, refusing what the editor cannot change safely: encrypted
 * files (with or without a password) and files PDFium cannot read.
 */
export async function openDocument(bytes: Uint8Array): Promise<OpenPdf> {
  const m = await pdfium()
  const filePtr = m.pdfium._malloc(bytes.length)
  m.pdfium.HEAPU8.set(bytes, filePtr)
  const doc = m.FPDF_LoadMemDocument(filePtr, bytes.length, "")
  if (!doc) {
    const code = m.FPDF_GetLastError()
    m.pdfium._free(filePtr)
    if (code === FPDF_ERR_PASSWORD || code === FPDF_ERR_SECURITY)
      throw new UnsupportedDocumentError("encrypted")
    throw new UnsupportedDocumentError(
      "damaged",
      code === FPDF_ERR_FORMAT ? null : `PDFium error ${code}`
    )
  }
  // -1 means no security handler. Anything else is encrypted, even when it
  // opens without a password, and saving could drop the protection.
  if (m.FPDF_GetSecurityHandlerRevision(doc) !== -1) {
    m.FPDF_CloseDocument(doc)
    m.pdfium._free(filePtr)
    throw new UnsupportedDocumentError("encrypted")
  }
  return { m, doc, filePtr }
}

export function closeDocument({ m, doc, filePtr }: OpenPdf) {
  m.FPDF_CloseDocument(doc)
  m.pdfium._free(filePtr)
}

// --- reading ----------------------------------------------------------------

export interface PdfPageInfo {
  width: number
  height: number
  /** The page's own rotation, in quarter turns. */
  rotation: number
}

export type FieldKind =
  "text" | "checkbox" | "radio" | "dropdown" | "unsupported"

export interface PdfWidget {
  /** Source page index. */
  page: number
  rect: Rect
  /** For radio buttons and checkboxes: the value this widget stands for. */
  exportValue: string
  checked: boolean
}

export interface PdfField {
  name: string
  kind: FieldKind
  /** PDFium's field type, kept to name unsupported kinds. */
  rawType: number
  readOnly: boolean
  value: string
  options: string[]
  widgets: PdfWidget[]
}

export interface PdfInfo {
  pages: PdfPageInfo[]
  fields: PdfField[]
}

const FIELD_KINDS: Record<number, FieldKind> = {
  2: "checkbox",
  3: "radio",
  4: "dropdown",
  6: "text",
}
const WIDGET = 20

function withForm<T>(pdf: OpenPdf, fn: (form: number) => T) {
  const { m, doc } = pdf
  const info = m.PDFiumExt_OpenFormFillInfo()
  const form = m.PDFiumExt_InitFormFillEnvironment(doc, info)
  try {
    return fn(form)
  } finally {
    m.PDFiumExt_ExitFormFillEnvironment(form)
    m.PDFiumExt_CloseFormFillInfo(info)
  }
}

function withPage<T>(pdf: OpenPdf, index: number, fn: (page: number) => T) {
  const page = pdf.m.FPDF_LoadPage(pdf.doc, index)
  try {
    return fn(page)
  } finally {
    pdf.m.FPDF_ClosePage(page)
  }
}

/** Page sizes and rotations, and every form field with its widgets. */
export function readInfo(pdf: OpenPdf): PdfInfo {
  const { m, doc } = pdf
  const pages: PdfPageInfo[] = []
  const fields = new Map<string, PdfField>()
  withForm(pdf, (form) => {
    for (let index = 0; index < m.FPDF_GetPageCount(doc); index++) {
      withPage(pdf, index, (page) => {
        pages.push({
          width: m.FPDF_GetPageWidthF(page),
          height: m.FPDF_GetPageHeightF(page),
          rotation: m.FPDFPage_GetRotation(page),
        })
        m.FORM_OnAfterLoadPage(page, form)
        for (let i = 0; i < m.FPDFPage_GetAnnotCount(page); i++) {
          const annot = m.FPDFPage_GetAnnot(page, i)
          try {
            if (m.FPDFAnnot_GetSubtype(annot) !== WIDGET) continue
            const name = readWString(m, (p, n) =>
              m.FPDFAnnot_GetFormFieldName(form, annot, p, n)
            )
            const rawType = m.FPDFAnnot_GetFormFieldType(form, annot)
            const field =
              fields.get(name) ??
              ({
                name,
                kind: FIELD_KINDS[rawType] ?? "unsupported",
                rawType,
                readOnly:
                  (m.FPDFAnnot_GetFormFieldFlags(form, annot) & 1) === 1,
                value: readWString(m, (p, n) =>
                  m.FPDFAnnot_GetFormFieldValue(form, annot, p, n)
                ),
                options: Array.from(
                  {
                    length: Math.max(
                      0,
                      m.FPDFAnnot_GetOptionCount(form, annot)
                    ),
                  },
                  (_, o) =>
                    readWString(m, (p, n) =>
                      m.FPDFAnnot_GetOptionLabel(form, annot, o, p, n)
                    )
                ),
                widgets: [],
              } satisfies PdfField)
            field.widgets.push({
              page: index,
              rect: readRect(m, annot),
              exportValue: readWString(m, (p, n) =>
                m.FPDFAnnot_GetFormFieldExportValue(form, annot, p, n)
              ),
              checked: m.FPDFAnnot_IsChecked(form, annot),
            })
            fields.set(name, field)
          } finally {
            m.FPDFPage_CloseAnnot(annot)
          }
        }
        m.FORM_OnBeforeClosePage(page, form)
      })
    }
  })
  return { pages, fields: [...fields.values()] }
}

/** Character boxes of a page's text layer, for highlighting. Empty on a scanned page. */
export function readChars(pdf: OpenPdf, index: number): PageChar[] {
  const { m } = pdf
  return withPage(pdf, index, (page) => {
    const text = m.FPDFText_LoadPage(page)
    const box = m.pdfium._malloc(32)
    try {
      const chars: PageChar[] = []
      for (let i = 0; i < m.FPDFText_CountChars(text); i++) {
        if (!m.FPDFText_GetCharBox(text, i, box, box + 8, box + 16, box + 24))
          continue
        const [left, right, bottom, top] = [0, 8, 16, 24].map((o) =>
          m.pdfium.getValue(box + o, "double")
        )
        chars.push({ rect: { left, right, bottom, top } })
      }
      return chars
    } finally {
      m.pdfium._free(box)
      m.FPDFText_ClosePage(text)
    }
  })
}

/** A page's text, in reading order as PDFium extracts it. */
export function readText(pdf: OpenPdf, index: number): string {
  const { m } = pdf
  return withPage(pdf, index, (page) => {
    const text = m.FPDFText_LoadPage(page)
    try {
      const count = m.FPDFText_CountChars(text)
      const ptr = m.pdfium._malloc((count + 1) * 2)
      try {
        m.FPDFText_GetText(text, 0, count, ptr)
        return m.pdfium.UTF16ToString(ptr)
      } finally {
        m.pdfium._free(ptr)
      }
    } finally {
      m.FPDFText_ClosePage(text)
    }
  })
}

/** Annotation subtypes on a page, for checks after saving. */
export function readAnnotationTypes(pdf: OpenPdf, index: number): number[] {
  const { m } = pdf
  return withPage(pdf, index, (page) =>
    Array.from({ length: m.FPDFPage_GetAnnotCount(page) }, (_, i) => {
      const annot = m.FPDFPage_GetAnnot(page, i)
      try {
        return m.FPDFAnnot_GetSubtype(annot)
      } finally {
        m.FPDFPage_CloseAnnot(annot)
      }
    })
  )
}

/**
 * Renders a page, unrotated, at `scale` device pixels per point, with the
 * annotations already in the file. Returns RGBA pixels for a canvas.
 */
export function renderPage(pdf: OpenPdf, index: number, scale: number) {
  const { m } = pdf
  return withPage(pdf, index, (page) => {
    const width = Math.max(1, Math.round(m.FPDF_GetPageWidthF(page) * scale))
    const height = Math.max(1, Math.round(m.FPDF_GetPageHeightF(page) * scale))
    const bitmap = m.FPDFBitmap_Create(width, height, 1)
    try {
      m.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff)
      // Flags: draw annotations (0x01) and use LCD-free text (0x10 off).
      m.FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, 0x01)
      const stride = m.FPDFBitmap_GetStride(bitmap)
      const source = m.pdfium.HEAPU8.subarray(
        m.FPDFBitmap_GetBuffer(bitmap),
        m.FPDFBitmap_GetBuffer(bitmap) + stride * height
      )
      // PDFium writes BGRA; canvases want RGBA.
      const rgba = new Uint8ClampedArray(width * height * 4)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const s = y * stride + x * 4
          const d = (y * width + x) * 4
          rgba[d] = source[s + 2]
          rgba[d + 1] = source[s + 1]
          rgba[d + 2] = source[s]
          rgba[d + 3] = source[s + 3]
        }
      }
      return { width, height, rgba }
    } finally {
      m.FPDFBitmap_Destroy(bitmap)
    }
  })
}

// --- saving -----------------------------------------------------------------

const ANNOT_TEXT = 1
const ANNOT_FREETEXT = 3
const ANNOT_HIGHLIGHT = 9
const PRINT_FLAG = 4
const HELVETICA = 4
const KEY_RETURN = 13

function setField(
  pdf: OpenPdf,
  form: number,
  field: PdfField,
  value: FieldValue
) {
  const { m } = pdf
  // Radio buttons choose the widget for the value; others use their first.
  const widget =
    value.kind === "choice" && field.kind === "radio"
      ? field.widgets.find((w) => w.exportValue === value.value)
      : field.widgets[0]
  if (!widget) throw new Error(`No widget for ${field.name}`)
  withPage(pdf, widget.page, (page) => {
    m.FORM_OnAfterLoadPage(page, form)
    try {
      for (let i = 0; i < m.FPDFPage_GetAnnotCount(page); i++) {
        const annot = m.FPDFPage_GetAnnot(page, i)
        try {
          if (m.FPDFAnnot_GetSubtype(annot) !== WIDGET) continue
          const name = readWString(m, (p, n) =>
            m.FPDFAnnot_GetFormFieldName(form, annot, p, n)
          )
          const exportValue = readWString(m, (p, n) =>
            m.FPDFAnnot_GetFormFieldExportValue(form, annot, p, n)
          )
          if (name !== field.name) continue
          if (field.kind === "radio" && exportValue !== widget.exportValue)
            continue
          if (!m.FORM_SetFocusedAnnot(form, annot))
            throw new Error(`Cannot focus ${field.name}`)
          if (value.kind === "text") {
            m.FORM_SelectAllText(form, page)
            withWString(m, value.text, (ptr) =>
              m.FORM_ReplaceSelection(form, page, ptr)
            )
          } else if (value.kind === "checked") {
            if (m.FPDFAnnot_IsChecked(form, annot) !== value.checked)
              m.FORM_OnChar(form, page, KEY_RETURN, 0)
          } else if (field.kind === "radio") {
            if (!m.FPDFAnnot_IsChecked(form, annot))
              m.FORM_OnChar(form, page, KEY_RETURN, 0)
          } else {
            const index = field.options.indexOf(value.value)
            if (index < 0 || !m.FORM_SetIndexSelected(form, page, index, true))
              throw new Error(`Cannot choose ${value.value} in ${field.name}`)
          }
          m.FORM_ForceToKillFocus(form)
          m.EPDFAnnot_GenerateFormFieldAP(annot)
          return
        } finally {
          m.FPDFPage_CloseAnnot(annot)
        }
      }
    } finally {
      m.FORM_OnBeforeClosePage(page, form)
    }
  })
}

function addAnnotation(pdf: OpenPdf, annotation: EditorAnnotation) {
  const { m } = pdf
  withPage(pdf, sourceIndex(annotation.page), (page) => {
    const subtype =
      annotation.kind === "highlight"
        ? ANNOT_HIGHLIGHT
        : annotation.kind === "comment"
          ? ANNOT_TEXT
          : ANNOT_FREETEXT
    const annot = m.FPDFPage_CreateAnnot(page, subtype)
    try {
      const r = annotation.rect
      withFloats(m, [r.left, r.top, r.right, r.bottom], (ptr) =>
        m.FPDFAnnot_SetRect(annot, ptr)
      )
      if (annotation.text)
        withWString(m, annotation.text, (ptr) =>
          m.FPDFAnnot_SetStringValue(annot, "Contents", ptr)
        )
      if (annotation.kind === "highlight") {
        m.FPDFAnnot_SetColor(annot, 0, 255, 230, 0, 255)
        for (const q of annotation.quads)
          withFloats(
            m,
            [
              q.left,
              q.top,
              q.right,
              q.top,
              q.left,
              q.bottom,
              q.right,
              q.bottom,
            ],
            (ptr) => m.FPDFAnnot_AppendAttachmentPoints(annot, ptr)
          )
      } else if (annotation.kind === "comment") {
        m.FPDFAnnot_SetColor(annot, 0, 255, 200, 0, 255)
      } else {
        m.EPDFAnnot_SetDefaultAppearance(annot, HELVETICA, 12, 0, 0, 0)
      }
      m.FPDFAnnot_SetFlags(annot, PRINT_FLAG)
      // PDFium draws the appearance, so every viewer shows the same thing.
      m.EPDFAnnot_GenerateAppearance(annot)
    } finally {
      m.FPDFPage_CloseAnnot(annot)
    }
  })
}

function saveCopy({ m, doc }: OpenPdf): Uint8Array {
  const writer = m.PDFiumExt_OpenFileWriter()
  try {
    m.PDFiumExt_SaveAsCopy(doc, writer)
    const size = m.PDFiumExt_GetFileWriterSize(writer)
    const data = m.pdfium._malloc(size)
    try {
      m.PDFiumExt_GetFileWriterData(writer, data, size)
      return m.pdfium.HEAPU8.slice(data, data + size)
    } finally {
      m.pdfium._free(data)
    }
  } finally {
    m.PDFiumExt_CloseFileWriter(writer)
  }
}

/**
 * The edited copy: the source with `ops` applied. Field values and
 * annotations go onto their source pages first; then pages turn, are
 * deleted, and take their final order. The source bytes are not modified.
 */
export async function applyEdits(
  source: Uint8Array,
  info: PdfInfo,
  ops: readonly PdfOp[]
): Promise<Uint8Array> {
  const pdf = await openDocument(source)
  try {
    const { m, doc } = pdf
    const state = derive(info.pages.length, ops)
    withForm(pdf, (form) => {
      for (const [name, value] of Object.entries(state.fields)) {
        const field = info.fields.find((f) => f.name === name)
        if (field && field.kind !== "unsupported" && !field.readOnly)
          setField(pdf, form, field, value)
      }
    })
    for (const annotation of state.annotations) addAnnotation(pdf, annotation)
    for (const [page, turns] of Object.entries(state.turns)) {
      if (turns === 0) continue
      const index = sourceIndex(page)
      withPage(pdf, index, (p) =>
        m.FPDFPage_SetRotation(p, (info.pages[index].rotation + turns) % 4)
      )
    }
    // Delete from the end so earlier indexes stay valid, then order what is left.
    const kept = new Set(state.order.map(sourceIndex))
    for (let i = info.pages.length - 1; i >= 0; i--)
      if (!kept.has(i)) m.FPDFPage_Delete(doc, i)
    const current = [...kept].sort((a, b) => a - b)
    state.order.forEach((page, target) => {
      const from = current.indexOf(sourceIndex(page))
      if (from === target) return
      const ptr = m.pdfium._malloc(4)
      try {
        m.pdfium.setValue(ptr, from, "i32")
        if (!m.FPDF_MovePages(doc, ptr, 1, target))
          throw new Error("Could not reorder the pages")
      } finally {
        m.pdfium._free(ptr)
      }
      current.splice(target, 0, ...current.splice(from, 1))
    })
    return saveCopy(pdf)
  } finally {
    closeDocument(pdf)
  }
}
