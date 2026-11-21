# Direct PDF and HTML export plan

## Design

Share rendering policy with preview. Use a Tauri Linux command to render HTML through a sandboxed Chromium process with a temporary profile and bounded run time. Write the rendered bytes to the user-selected path after successful conversion.

## Scaffold status

The export pipeline is in place (005.04). A `DocumentType` may carry an `exporter` that returns standalone HTML; the Markdown exporter reuses the preview pipeline and URL policy, embeds the document styles and active theme tokens, inlines local images and Mermaid SVGs as data URLs, embeds KaTeX's stylesheet and woff2 fonts when the document has math (005.01; native MathML is the fallback), and adds a content security policy that loads nothing. File → Export as HTML or PDF opens one destination chooser (`pick_export_path`). PDF export (`export_pdf`) renders that HTML with headless Chromium (sandbox on, temporary profile, no network, 60 second limit) and writes the destination atomically only after a PDF was produced. The RPM and deb recommend `chromium` (005.02), and the packaging job renders `scripts/export-sample.ts` with Fedora 44's Chromium through `src-tauri/examples/render_pdf.rs`, the same code path as the app.

## Verification

Use the criteria in [spec.md](spec.md) and complete the integrated check in [tasks.md](tasks.md) in the packaged Fedora 44 application. Record pass or fail with the tested build and evidence.
