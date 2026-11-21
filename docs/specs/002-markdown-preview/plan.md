# Markdown preview plan

## Design

Keep the unified Markdown pipeline, React renderer, code highlighting, math, and diagram support inside the Markdown feature. Apply the same URL policy to preview and export.

## Scaffold status

002.04 is in place: `src/features/markdown/lib/render/pipeline.ts` turns Markdown into a sanitized HTML tree (GFM, footnotes, highlighting; raw HTML dropped; links limited to http, https, mailto, and anchors; images to http and https). The preview renders that tree; export will serialize the same tree with `markdown.css`. Editor, preview, and split modes live in the document toolbar. Local images, math, and diagrams are 002.01 and 002.02.

## Verification

Use the criteria in [spec.md](spec.md) and complete the integrated check in [tasks.md](tasks.md) in the packaged Fedora 44 application. Record pass or fail with the tested build and evidence.
