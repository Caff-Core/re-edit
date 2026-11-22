# PDF editing

## Outcome

Open a local PDF, annotate it, fill its form, rearrange its pages, and save an edited copy that any PDF viewer shows the same way, while the source file stays untouched.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-015 | Open local PDFs with page thumbnails, zoom, and page navigation by keyboard and pointer. Encrypted or otherwise unsupported files that cannot be modified safely open to a clear error, never a partial edit. | AC-015. Open a multi-page fixture, move between pages with thumbnails and the keyboard, and zoom in and out. Open an encrypted fixture and see the error. |
| REQ-016 | Highlight selectable text, and add comments and text boxes. Select, edit, move, and delete annotations added in the editor. Scanned pages without a text layer support page tools and text boxes. Existing annotations are kept where the engine supports them. | AC-016. Highlight text, add a comment and a text box, move and edit the text box, delete the comment, and add a text box to a scanned page. |
| REQ-017 | Fill existing standard form fields: text fields, checkboxes, radio buttons, and dropdowns. Other field types show a clear "not supported" message and keep their value. | AC-017. Fill one field of each supported kind, and see the message on an unsupported field. |
| REQ-018 | Reorder, rotate, and delete pages, with menu and keyboard alternatives to dragging. The final page cannot be deleted. Each page keeps a stable identity, so its annotations and form values follow it. | AC-018. Reorder pages by keyboard and by drag, rotate one, delete one, try to delete the last remaining page, and confirm every annotation stays on its page. |
| REQ-019 | Undo and redo annotations, form changes, and page operations. The primary save is Save Edited Copy: the source file is not modified unless the user explicitly saves over it and confirms. Cancelled and failed saves keep every edit. | AC-019. Fill a form, add a highlight and a text box, rotate and reorder pages, and save an edited copy. Reopen the copy in an independent viewer: edits persist, annotations are on the right pages, and the source is byte-identical. Exercise undo, a cancelled save, and a failed save. |

Deferred for the first release: replacing existing page text and images, optical character recognition, redaction, and digital signature editing.

## Verification status

Automated checks ran on 2026-11-22 (Vitest with PDFium on Fedora 44, plus a headless Chromium run of the browser build); the packaged walkthrough (007.07) has not run yet.

| Acceptance | Automated | Packaged Fedora 44 |
|---|---|---|
| AC-015 | Pass: encrypted (owner and user password) and damaged files refused, pages and fields read (`lib/pdfium.test.ts`); encrypted file opens no tab (`pdf-editor.test.tsx`). Thumbnails, zoom, and page navigation seen in the browser build | Not run yet |
| AC-016 | Pass: text box and comment added, edited, moved, deleted, and undone by keyboard, saved as FreeText and Text annotations on the scanned page (`pdf-editor.test.tsx`); highlight quads follow the text (`lib/model.test.ts`); highlight dragged across text in the browser build | Not run yet |
| AC-017 | Pass: text, checkbox, radio, and dropdown values saved and read back (`lib/pdfium.test.ts`, `pdf-editor.test.tsx`); list box explained as unsupported and kept | Not run yet |
| AC-018 | Pass: keyboard rotate, move, and delete with the last-page guard (`pdf-editor.test.tsx`); page identity through moves and deletes (`lib/model.test.ts`) | Not run yet |
| AC-019 | Pass: edited copy reopened with PDFium with the right order, rotation, fields, and annotations per page, and a byte-identical source (`lib/pdfium.test.ts`, `pdf-editor.test.tsx`); the spike checked the same copy with MuPDF, poppler, Ghostscript, and pdf.js. Cancelled and failed saves use the shared 006 paths | Not run yet (needs an independent viewer: Evince or Okular) |
