# Markdown preview

## Outcome

Review the current buffer as it is edited, with the same document semantics used by export.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-003 | Provide editor, preview, and split modes with tables, task lists, footnotes, headings, images, and code highlighting. | AC-003. Open fixtures covering the listed syntax, update the source, and verify the preview updates while focus stays in the editor. |
| REQ-004 | Render equations and Mermaid diagrams with readable error fallbacks and safe link and image handling. | AC-004. Render valid and invalid math and diagrams. Verify a clear error for malformed input and that active raw HTML cannot run. |

## Verification status

Packaged Fedora 44 walkthrough, recorded 2026-11-22.

- Build: re-edit 0.2.0-1 RPM (commit 87835b7), installed with `dnf` on Fedora 44 (Linux 7.3), with chromium-157.0.8103.78-1.fc44.
- Steps: the walkthrough checklist on #13.
- Evidence: run by the maintainer, who reported "All good" for the walkthroughs. No per-step notes or screenshots were recorded.

| Acceptance | Result |
|---|---|
| AC-003 | Pass |
| AC-004 | Pass |
