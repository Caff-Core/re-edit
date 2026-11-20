# Markdown preview

## Outcome

Review the current buffer as it is edited, with the same document semantics used by export.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-003 | Provide editor, preview, and split modes with tables, task lists, footnotes, headings, images, and code highlighting. | AC-003. Open fixtures covering the listed syntax, update the source, and verify the preview updates while focus stays in the editor. |
| REQ-004 | Render equations and Mermaid diagrams with readable error fallbacks and safe link and image handling. | AC-004. Render valid and invalid math and diagrams. Verify a clear error for malformed input and that active raw HTML cannot run. |

## Verification status

Packaged Fedora 44 acceptance checks are pending.
