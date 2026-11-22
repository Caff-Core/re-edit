// Engine B: PDFium (EmbedPDF WebAssembly build) locates text and writes the edits.
import { readFileSync, writeFileSync } from "node:fs"
import { init } from "@embedpdf/pdfium"

const [fixture, scenario] = process.argv.slice(2)
const source = readFileSync(`fixtures/${fixture}.pdf`)
const log = { engine: "B", fixture, steps: [] }
const t0 = performance.now()
const m = await init({ wasmBinary: readFileSync("node_modules/@embedpdf/pdfium/dist/pdfium.wasm").buffer })
m.PDFiumExt_Init()
const P = m.pdfium
const step = (name, fn) => {
  try { const r = fn(); if (r === false) throw new Error("PDFium returned false"); log.steps.push({ name, ok: true, ...(typeof r === "string" ? { note: r } : {}) }) }
  catch (e) { log.steps.push({ name, ok: false, error: String(e.message ?? e) }) }
}
const wstr = (s, fn) => {
  const len = (s.length + 1) * 2, ptr = P._malloc(len)
  try { P.stringToUTF16(s, ptr, len); return fn(ptr) } finally { P._free(ptr) }
}
const floats = (values, fn) => {
  const ptr = P._malloc(values.length * 4)
  values.forEach((v, i) => P.setValue(ptr + i * 4, v, "float"))
  try { return fn(ptr) } finally { P._free(ptr) }
}
const readW = (call) => {
  const size = call(0, 0)
  if (size <= 2) return ""
  const ptr = P._malloc(size)
  try { call(ptr, size); return P.UTF16ToString(ptr) } finally { P._free(ptr) }
}

const filePtr = P._malloc(source.length)
P.HEAPU8.set(source, filePtr)
const doc = m.FPDF_LoadMemDocument(filePtr, source.length, "")
if (!doc) {
  const code = m.FPDF_GetLastError()
  log.load = { ok: false, error: `FPDF_GetLastError ${code}${code === 4 ? " (password required)" : ""}` }
} else {
  const revision = m.FPDF_GetSecurityHandlerRevision(doc)
  log.load = { ok: true, encrypted: revision !== -1, securityRevision: revision }
}

/** Quad of `needle` on a page from PDFium's text page (the app's text layer would come from here). */
function quadFor(page, needle) {
  const tp = m.FPDFText_LoadPage(page)
  const count = m.FPDFText_CountChars(tp)
  const buf = P._malloc((count + 1) * 2)
  m.FPDFText_GetText(tp, 0, count, buf)
  const text = P.UTF16ToString(buf); P._free(buf)
  const start = text.indexOf(needle)
  const box = P._malloc(32)
  let l = Infinity, r = -Infinity, b = Infinity, t = -Infinity
  const line = text.slice(start).split(/\r?\n/)[0]
  for (let i = start; i < start + line.length; i++) {
    m.FPDFText_GetCharBox(tp, i, box, box + 8, box + 16, box + 24)
    const [cl, cr, cb, ct] = [0, 8, 16, 24].map((o) => P.getValue(box + o, "double"))
    if (cr > cl) { l = Math.min(l, cl); r = Math.max(r, cr); b = Math.min(b, cb); t = Math.max(t, ct) }
  }
  P._free(box); m.FPDFText_ClosePage(tp)
  return { left: l, right: r, bottom: b - 2, top: t + 2 }
}

function textBox(page, text, x, y) {
  const a = m.FPDFPage_CreateAnnot(page, 3 /* FreeText */)
  floats([x, y + 20, x + 130, y], (ptr) => m.FPDFAnnot_SetRect(a, ptr))
  wstr(text, (ptr) => m.FPDFAnnot_SetStringValue(a, "Contents", ptr))
  m.EPDFAnnot_SetDefaultAppearance(a, 4 /* Helvetica */, 12, 0, 0, 0)
  m.FPDFAnnot_SetFlags(a, 4 /* print */)
  const ok = m.EPDFAnnot_GenerateAppearance(a)
  m.FPDFPage_CloseAnnot(a)
  return ok
}

if (doc && log.load.encrypted !== true) {
  if (scenario === "form") {
    const formInfo = m.PDFiumExt_OpenFormFillInfo()
    const form = m.PDFiumExt_InitFormFillEnvironment(doc, formInfo)
    const p0 = m.FPDF_LoadPage(doc, 0)
    m.FORM_OnAfterLoadPage(p0, form)
    const widgets = []
    for (let i = 0; i < m.FPDFPage_GetAnnotCount(p0); i++) {
      const a = m.FPDFPage_GetAnnot(p0, i)
      if (m.FPDFAnnot_GetSubtype(a) !== 20) { m.FPDFPage_CloseAnnot(a); continue }
      widgets.push({
        a, type: m.FPDFAnnot_GetFormFieldType(form, a),
        name: readW((p, n) => m.FPDFAnnot_GetFormFieldName(form, a, p, n)),
        exportValue: readW((p, n) => m.FPDFAnnot_GetFormFieldExportValue(form, a, p, n)),
      })
    }
    const find = (name, exportValue) => widgets.find((w) => w.name === name && (!exportValue || w.exportValue === exportValue))
    const focus = (w) => { if (!m.FORM_SetFocusedAnnot(form, w.a)) throw new Error("cannot focus field") }
    const done = (w) => { m.FORM_ForceToKillFocus(form); m.EPDFAnnot_GenerateFormFieldAP(w.a) }
    step("fill text", () => { const w = find("name"); focus(w); m.FORM_SelectAllText(form, p0); wstr("Ada Lovelace", (ptr) => m.FORM_ReplaceSelection(form, p0, ptr)); done(w) })
    step("check box", () => { const w = find("agree"); focus(w); m.FORM_OnChar(form, p0, 13, 0); done(w) })
    step("radio", () => { const w = find("color", "green"); if (!w) throw new Error("no green radio"); focus(w); m.FORM_OnChar(form, p0, 13, 0); done(w) })
    step("dropdown", () => { const w = find("size"); focus(w); if (!m.FORM_SetIndexSelected(form, p0, 1, true)) throw new Error("select failed"); done(w) })
    step("list box is a separate kind", () => `field type ${find("tags").type} (5 = list box)`)
    widgets.forEach((w) => m.FPDFPage_CloseAnnot(w.a))
    m.FORM_OnBeforeClosePage(p0, form)
    step("rotate page ONE", () => { m.FPDFPage_SetRotation(p0, 1) })
    m.FPDF_ClosePage(p0)

    const p1 = m.FPDF_LoadPage(doc, 1)
    step("highlight page TWO", () => {
      const q = quadFor(p1, "Highlight target")
      const a = m.FPDFPage_CreateAnnot(p1, 9 /* Highlight */)
      m.FPDFAnnot_SetColor(a, 0, 255, 255, 0, 255)
      floats([q.left, q.top, q.right, q.top, q.left, q.bottom, q.right, q.bottom], (ptr) => m.FPDFAnnot_AppendAttachmentPoints(a, ptr))
      floats([q.left, q.top, q.right, q.bottom], (ptr) => m.FPDFAnnot_SetRect(a, ptr))
      wstr("Spike highlight", (ptr) => m.FPDFAnnot_SetStringValue(a, "Contents", ptr))
      m.FPDFAnnot_SetFlags(a, 4)
      const ok = m.EPDFAnnot_GenerateAppearance(a)
      m.FPDFPage_CloseAnnot(a)
      return ok
    })
    m.FPDF_ClosePage(p1)
    const p2 = m.FPDF_LoadPage(doc, 2)
    step("text box page THREE", () => textBox(p2, "Spike text box", 72, 600))
    m.FPDF_ClosePage(p2)
    step("delete page FOUR", () => { m.FPDFPage_Delete(doc, 3) })
    step("reorder THREE, ONE, TWO", () => {
      const idx = P._malloc(4); P.setValue(idx, 2, "i32")
      try { return m.FPDF_MovePages(doc, idx, 1, 0) } finally { P._free(idx) }
    })
    m.PDFiumExt_ExitFormFillEnvironment(form)
    m.PDFiumExt_CloseFormFillInfo(formInfo)
  } else {
    const target = scenario === "annotated" ? 1 : 0
    const page = m.FPDF_LoadPage(doc, target)
    step(`text box page ${target + 1}`, () => textBox(page, "Spike text box", 72, 500))
    m.FPDF_ClosePage(page)
  }
  const writer = m.PDFiumExt_OpenFileWriter()
  m.PDFiumExt_SaveAsCopy(doc, writer)
  const size = m.PDFiumExt_GetFileWriterSize(writer)
  const data = P._malloc(size)
  m.PDFiumExt_GetFileWriterData(writer, data, size)
  const out = P.HEAPU8.slice(data, data + size)
  P._free(data); m.PDFiumExt_CloseFileWriter(writer)
  writeFileSync(`out/b/${fixture}.pdf`, out)
  log.saved = { bytes: out.length }
}
if (doc) m.FPDF_CloseDocument(doc)
P._free(filePtr)
log.ms = Math.round(performance.now() - t0)
console.log(JSON.stringify(log))
