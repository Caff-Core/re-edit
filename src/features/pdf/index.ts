// Public API. The editor and PDFium load lazily through pdfDocumentType, so
// they are not exported here: a static export would pull them into startup.
export { pdfDocumentType } from "./document-type"
export type { PdfDocument } from "./document-type"
