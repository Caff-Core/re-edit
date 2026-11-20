# File management

## Outcome

Open a folder of Markdown files and move between multiple documents without losing edits.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-005 | Provide native Open, Save, Save As, tabs, file tree, recent files, and draft recovery. | AC-005. Open a folder, edit two files, switch tabs, cancel a close, and restore both drafts after restart. |
| REQ-006 | Detect outside changes and retain unsaved text through conflict, cancellation, and write failure. | AC-006. Edit the file externally with a dirty tab, then verify both versions remain available and a failed write preserves the buffer. |

## Verification status

Packaged Fedora 44 acceptance checks are pending.
