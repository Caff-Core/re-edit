// Engine A: pdf.js locates text, pdf-lib (@cantoo fork) writes the edits.
import { readFileSync, writeFileSync } from "node:fs"
import {
  PDFDocument, PDFName, PDFString, PDFNumber, StandardFonts, degrees, rgb,
} from "@cantoo/pdf-lib"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

const [fixture, scenario] = process.argv.slice(2)
const source = readFileSync(`fixtures/${fixture}.pdf`)
const log = { engine: "A", fixture, steps: [] }
const step = (name, fn) => {
  try { const r = fn(); log.steps.push({ name, ok: true, ...(r ? { note: r } : {}) }) }
  catch (e) { log.steps.push({ name, ok: false, error: String(e.message ?? e) }) }
}
const t0 = performance.now()

/** Quad of the first text item containing `needle`, from pdf.js's text layer. */
async function quadFor(bytes, pageIndex, needle) {
  const task = getDocument({ data: new Uint8Array(bytes), verbosity: 0 })
  const pdf = await task.promise
  const page = await pdf.getPage(pageIndex + 1)
  const item = (await page.getTextContent()).items.find((i) => i.str.includes(needle))
  const [, , , size, x, y] = item.transform
  const left = x, right = x + item.width, bottom = y - size * 0.25, top = y + size * 0.85
  await task.destroy()
  return { left, right, bottom, top }
}

function highlight(doc, page, q) {
  // Appearance: a multiply-blended yellow rectangle, so text stays readable in every viewer.
  const ap = doc.context.stream(
    `/GS0 gs 1 1 0 rg ${q.left} ${q.bottom} ${q.right - q.left} ${q.top - q.bottom} re f`,
    { Type: "XObject", Subtype: "Form", BBox: [q.left, q.bottom, q.right, q.top],
      Resources: { ExtGState: { GS0: { Type: "ExtGState", BM: "Multiply", ca: 1 } } } })
  const apRef = doc.context.register(ap)
  const annot = doc.context.obj({
    Type: "Annot", Subtype: "Highlight", F: 4, C: [1, 1, 0],
    Rect: [q.left, q.bottom, q.right, q.top],
    QuadPoints: [q.left, q.top, q.right, q.top, q.left, q.bottom, q.right, q.bottom],
    Contents: PDFString.of("Spike highlight"), AP: { N: apRef },
  })
  page.node.addAnnot(doc.context.register(annot))
}

async function textBox(doc, page, text, x, y) {
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const w = font.widthOfTextAtSize(text, 12) + 8, h = 20
  const ap = doc.context.stream(
    `0 0 0 RG 1 w 0.5 0.5 ${w - 1} ${h - 1} re S BT /Helv 12 Tf 0 0 0 rg 4 6 Td (${text}) Tj ET`,
    { Type: "XObject", Subtype: "Form", BBox: [0, 0, w, h], Resources: { Font: { Helv: font.ref } } })
  const apRef = doc.context.register(ap)
  const annot = doc.context.obj({
    Type: "Annot", Subtype: "FreeText", F: 4, Rect: [x, y, x + w, y + h],
    Contents: PDFString.of(text), DA: PDFString.of("/Helv 12 Tf 0 0 0 rg"),
    AP: { N: apRef },
  })
  page.node.addAnnot(doc.context.register(annot))
}

let doc
try {
  doc = await PDFDocument.load(source, { updateMetadata: false })
} catch (e) {
  log.load = { ok: false, error: `${e.constructor?.name}: ${e.message}` }
}
if (doc) {
  log.load = { ok: true, encrypted: doc.isEncrypted }
  if (doc.isEncrypted) log.load.note = "loaded despite encryption; a save would not be safe"
}

if (doc && !doc.isEncrypted) {
  if (scenario === "form") {
    const form = doc.getForm()
    step("fill text", () => form.getTextField("name").setText("Ada Lovelace"))
    step("check box", () => form.getCheckBox("agree").check())
    step("radio", () => form.getRadioGroup("color").select("green"))
    step("dropdown", () => form.getDropdown("size").select("M"))
    step("list box is a separate kind", () => `${form.getField("tags").constructor.name}`)
    const q = await quadFor(source, 1, "Highlight target")
    step("highlight page TWO", () => highlight(doc, doc.getPage(1), q))
    await textBox(doc, doc.getPage(2), "Spike text box", 72, 600).then(
      () => log.steps.push({ name: "text box page THREE", ok: true }),
      (e) => log.steps.push({ name: "text box page THREE", ok: false, error: String(e) }))
    step("rotate page ONE", () => doc.getPage(0).setRotation(degrees(90)))
    step("delete page FOUR", () => doc.removePage(3))
    step("reorder THREE, ONE, TWO", () => {
      // pdf-lib has no move: rewrite the page tree as one flat list in the new order.
      const refs = doc.getPages().map((p) => p.ref)
      const order = [refs[2], refs[0], refs[1]]
      const root = doc.catalog.lookup(PDFName.of("Pages"))
      const rootRef = doc.catalog.get(PDFName.of("Pages"))
      root.set(PDFName.of("Kids"), doc.context.obj(order))
      root.set(PDFName.of("Count"), PDFNumber.of(order.length))
      for (const ref of order) doc.context.lookup(ref).set(PDFName.of("Parent"), rootRef)
      return "flat page tree rewritten by hand"
    })
  } else {
    const target = scenario === "annotated" ? 1 : 0
    await textBox(doc, doc.getPage(target), "Spike text box", 72, 500).then(
      () => log.steps.push({ name: `text box page ${target + 1}`, ok: true }),
      (e) => log.steps.push({ name: "text box", ok: false, error: String(e) }))
  }
  const out = await doc.save()
  writeFileSync(`out/a/${fixture}.pdf`, out)
  log.saved = { bytes: out.length }
}
log.ms = Math.round(performance.now() - t0)
console.log(JSON.stringify(log))
