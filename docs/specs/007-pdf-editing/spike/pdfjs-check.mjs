// A third reader (pdf.js, as in Firefox): page text, rotation, annotations, and field values.
import { readFileSync } from "node:fs"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
for (const file of process.argv.slice(2)) {
  const task = getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 })
  const pdf = await task.promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const text = (await page.getTextContent()).items.map((t) => t.str).find((s) => /PAGE|SCANNED|ANNOTATED|SECOND/.test(s)) ?? "(image)"
    const annots = (await page.getAnnotations()).filter((a) => a.subtype !== "Widget").map((a) => a.subtype)
    pages.push(`${text}@${page.rotate}[${annots.join(",")}]`)
  }
  const fields = Object.entries((await pdf.getFieldObjects()) ?? {}).map(([n, w]) => `${n}=${w.map((x) => x.value).find((v) => v && v !== "Off") ?? w[0].value}`)
  console.log(file, "|", pages.join(" | "), "|", fields.join(" "))
  await task.destroy()
}
