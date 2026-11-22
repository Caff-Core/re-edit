# PDF editing plan

## Engine decision

Chosen by a round-trip spike (007.01) before any editor code. Two candidates, both under permissive licences:

- **A. pdf.js with pdf-lib** (the maintained `@cantoo/pdf-lib` fork). pdf.js renders pages, the text layer used for highlights, and thumbnails; pdf-lib writes form values, page order, rotation, deletion, and new annotations. Pure JavaScript and small. Risks: annotations need hand-built appearance streams to show in every viewer, and it cannot save encrypted files.
- **B. PDFium compiled to WebAssembly** (EmbedPDF). One engine renders, edits, generates annotation appearances, and saves incrementally. Risks: about 4 to 5 MB more, and a lower-level API.

MuPDF is excluded: its AGPL-3.0 licence would apply to the whole app.

The spike scripts AC-019 with each engine (fill one field of each supported kind, add a highlight and a text box, rotate, reorder, and delete pages, save a copy). It checks the copy with tools independent of both engines (poppler's `pdfinfo`, `pdftotext`, and `pdftoppm`, and `qpdf --check`), checks that the source is byte-identical, and repeats with encrypted, scanned, and already-annotated fixtures. The result and the choice are recorded here before 007.02 starts.

### Spike result (007.01, run 2026-11-22)

Scripts, fixtures, and the render comparison are in [spike/](spike/); `spike/run.sh` reruns everything. Fixtures were built with reportlab and encrypted with `mutool`, so neither candidate made its own test input. Outputs were checked with MuPDF (`mutool run`), poppler (`pdfinfo`, `pdftotext`, `pdftoppm`), Ghostscript, and pdf.js as a third reader. `qpdf` is not installed on this machine, so Ghostscript and MuPDF stood in for its structure check.

| Check | A: pdf.js + pdf-lib 2.11.1 | B: PDFium (EmbedPDF 2.15.1) |
|---|---|---|
| Fill text, checkbox, radio, dropdown | Pass | Pass |
| List box recognised as a separate kind | Pass | Pass |
| Highlight on page TWO, text box on page THREE | Pass only after a second attempt: hand-built appearance streams were silently empty the first time, so neither annotation showed in poppler | Pass: the engine generates the appearances |
| Rotate, delete, reorder | Pass only after a second attempt: pdf-lib has no page move, and remove-then-insert corrupted the page tree (dangling object, blank page). The fix rewrites the page tree by hand | Pass: `FPDF_MovePages`, `FPDFPage_Delete`, `FPDFPage_SetRotation` |
| Copy reopens correctly in MuPDF, poppler, Ghostscript, pdf.js (order, rotation, annotations on the right pages, field values) | Pass (after both fixes) | Pass |
| Text box on a scanned page; existing annotations kept | Pass | Pass |
| Source files byte-identical | Pass | Pass |
| Encrypted, owner password only | Refuses to load (cannot tell it apart from a password-protected file) | Loads and reports security revision 6, so the app can refuse it with a precise message, or later unlock permissions |
| Encrypted with a user password | Refuses to load | Refuses: "password required" |
| Ghostscript and MuPDF warnings | None | None; poppler notes "Can't get Fields array" on files without a form (PDFium adds an empty form dictionary; harmless, to be checked in 007.06) |
| Time for the form scenario (Bun, this machine) | 116 ms including pdf.js | 58 ms including WebAssembly start-up |
| Size, raw (gzip) | pdf.js 1.7 MB (0.5 MB) + pdf-lib 0.6 MB (0.25 MB) | PDFium 4.5 MB (2.1 MB) + JavaScript 0.6 MB (0.1 MB) |
| Licences | Apache-2.0, MIT | BSD-3-Clause (PDFium), MIT (EmbedPDF) |

Both need a content security policy change in `tauri.conf.json`: A a worker source for pdf.js, B `'wasm-unsafe-eval'` and a worker source.

### Decision

**PDFium through EmbedPDF**, chosen by the maintainer on 2026-11-22 after the spike below.

### Recommendation given

**B, PDFium through EmbedPDF.** One engine renders, reads text, edits, and saves, so what the editor shows is what it writes. It generates annotation and field appearances itself, and it moves and deletes pages natively. Those are exactly the two places where A failed silently on the first try and needed hand-written PDF structure to pass. A would leave that structure code in the app for every annotation kind, plus editing existing annotations, plus any later incremental save. PDFium covers all three. The cost is about 3 MB more, loaded only when the first PDF opens, and a lower-level API. The app would use the `@embedpdf/engines` worker engine for most operations and the raw module for rotation and page moves.

## Design

- Lives in `src/features/pdf`. The workspace sees only the `DocumentType` contract from 006.
- **Document model.** The source bytes stay immutable. Edits form an ordered log of operations on pages identified by a stable page id (assigned on load, independent of position): annotate, edit or move or delete annotation, set field, reorder, rotate, delete page. Undo and redo walk the log. Dirty means the log differs from the last saved point. The draft is the log as JSON.
- **Saving.** `serialize()` replays the log onto a fresh copy of the source with the chosen engine. The type's primary save is a copy (006): Save Edited Copy suggests `name (edited).pdf`.
- **Interface.** A thumbnail rail (listbox: arrow keys move, Alt+Up/Down reorder, R rotates, Delete removes, menu on each thumbnail), a page view with zoom, and a tool bar (Select, Highlight, Comment, Text box). Format controls stay in the feature; shared controls come from shadcn/ui and ReUI.
- **Limits.** 200 MB per file. Encrypted, broken, or unsupported files throw `UnsupportedDocument` with the reason.

## Verification

Planned checks: the engine spike above; unit tests for the operation log (page identity through reorder and delete, undo and redo, dirty tracking, draft restore); round-trip tests on fixtures checked with poppler and qpdf in CI; keyboard tests for page tools and annotations. The packaged Fedora 44 check opens the saved copy in an independent viewer (Evince or Okular) and covers native dialogs and binary saves.
