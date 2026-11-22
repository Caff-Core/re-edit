# File management

## Outcome

Open a folder of Markdown files and move between multiple documents without losing edits.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-005 | Provide native Open, Save, Save As, tabs, file tree, recent files, and draft recovery. | AC-005. Open a folder, edit two files, switch tabs, cancel a close, and restore both drafts after restart. |
| REQ-006 | Detect outside changes and retain unsaved text through conflict, cancellation, and write failure. | AC-006. Edit the file externally with a dirty tab, then verify both versions remain available and a failed write preserves the buffer. |

## Verification status

Packaged Fedora 44 walkthrough, recorded 2026-11-22.

- Build: re-edit 0.2.0-1 RPM (commit 87835b7), installed with `dnf` on Fedora 44 (Linux 7.3), with chromium-157.0.8103.78-1.fc44.
- Steps: the walkthrough checklist on #16.
- Evidence: run by the maintainer, who reported "All good" for the walkthroughs. No per-step notes or screenshots were recorded.

| Acceptance | Result |
|---|---|
| AC-005 | Pass |
| AC-006 | Pass |
