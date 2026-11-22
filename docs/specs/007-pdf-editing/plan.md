# PDF editing plan

## Engine decision

Chosen by a round-trip spike (007.01) before any editor code. Two candidates, both under permissive licences:

- **A. pdf.js with pdf-lib** (the maintained `@cantoo/pdf-lib` fork). pdf.js renders pages, the text layer used for highlights, and thumbnails; pdf-lib writes form values, page order, rotation, deletion, and new annotations. Pure JavaScript and small. Risks: annotations need hand-built appearance streams to show in every viewer, and it cannot save encrypted files.
- **B. PDFium compiled to WebAssembly** (EmbedPDF). One engine renders, edits, generates annotation appearances, and saves incrementally. Risks: about 4 to 5 MB more, and a lower-level API.

MuPDF is excluded: its AGPL-3.0 licence would apply to the whole app.

The spike scripts AC-019 with each engine (fill one field of each supported kind, add a highlight and a text box, rotate, reorder, and delete pages, save a copy). It checks the copy with tools independent of both engines (poppler's `pdfinfo`, `pdftotext`, and `pdftoppm`, and `qpdf --check`), checks that the source is byte-identical, and repeats with encrypted, scanned, and already-annotated fixtures. The result and the choice are recorded here before 007.02 starts.

## Design

- Lives in `src/features/pdf`. The workspace sees only the `DocumentType` contract from 006.
- **Document model.** The source bytes stay immutable. Edits form an ordered log of operations on pages identified by a stable page id (assigned on load, independent of position): annotate, edit or move or delete annotation, set field, reorder, rotate, delete page. Undo and redo walk the log. Dirty means the log differs from the last saved point. The draft is the log as JSON.
- **Saving.** `serialize()` replays the log onto a fresh copy of the source with the chosen engine. The type's primary save is a copy (006): Save Edited Copy suggests `name (edited).pdf`.
- **Interface.** A thumbnail rail (listbox: arrow keys move, Alt+Up/Down reorder, R rotates, Delete removes, menu on each thumbnail), a page view with zoom, and a tool bar (Select, Highlight, Comment, Text box). Format controls stay in the feature; shared controls come from shadcn/ui and ReUI.
- **Limits.** 200 MB per file. Encrypted, broken, or unsupported files throw `UnsupportedDocument` with the reason.

## Verification

Planned checks: the engine spike above; unit tests for the operation log (page identity through reorder and delete, undo and redo, dirty tracking, draft restore); round-trip tests on fixtures checked with poppler and qpdf in CI; keyboard tests for page tools and annotations. The packaged Fedora 44 check opens the saved copy in an independent viewer (Evince or Okular) and covers native dialogs and binary saves.
