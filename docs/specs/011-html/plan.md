# HTML plan

## Design

`src/features/html` registers `.html` and `.htm` on the shared CodeMirror pieces (`@codemirror/lang-html`) and the text codec.

- **Preview.** An `iframe` with an empty `sandbox` attribute (no scripts, no same origin, no forms, no top navigation) and `srcdoc` set from the buffer after a short pause in typing. A content security policy is injected at the top of the preview copy only: `default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:`. Remote resources therefore fail and local images show only if inlined. The saved file is always the untouched buffer.
- **Native bridge.** With no same-origin and no scripts, the frame cannot reach the Tauri bridge. A test confirms that the app's capability configuration grants nothing to framed content.
- The editor and preview sit side by side, like the Markdown split view, using the same layout components.

## Verification

Planned checks: the AC-027 fixture in jsdom (sandbox and policy attributes) and in the packaged app (nothing runs, loads, or navigates), and a byte-identical save round trip.
