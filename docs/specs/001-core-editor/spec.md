# Core editor

## Outcome

Write Markdown offline in a responsive desktop editor and keep document state isolated by type.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-001 | Edit Markdown with syntax highlighting, undo/redo, find and replace, formatting shortcuts, and keyboard-accessible table editing. | AC-001. Open a sample, format selected text, replace a term, edit a table, then undo and redo using the keyboard. |
| REQ-002 | Reuse an atomic editor shell and register document feature types independently. | AC-002. Register a test document type, open it in a tab, and verify its own save and dirty status without changing the Markdown module. |

## Verification status

Packaged Fedora 44 walkthrough, recorded 2026-11-22.

- Build: re-edit 0.2.0-1 RPM (commit 87835b7), installed with `dnf` on Fedora 44 (Linux 7.3), with chromium-157.0.8103.78-1.fc44.
- Steps: the walkthrough checklist on #10.
- Evidence: run by the maintainer, who reported "All good" for the walkthroughs. No per-step notes or screenshots were recorded.

| Acceptance | Result |
|---|---|
| AC-001 | Pass |
| AC-002 | Pass |
