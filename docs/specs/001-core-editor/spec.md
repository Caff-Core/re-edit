# Core editor

## Outcome

Write Markdown offline in a responsive desktop editor and keep document state isolated by type.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-001 | Edit Markdown with syntax highlighting, undo/redo, find and replace, formatting shortcuts, and keyboard-accessible table editing. | AC-001. Open a sample, format selected text, replace a term, edit a table, then undo and redo using the keyboard. |
| REQ-002 | Reuse an atomic editor shell and register document feature types independently. | AC-002. Register a test document type, open it in a tab, and verify its own save and dirty status without changing the Markdown module. |

## Verification status

Packaged Fedora 44 acceptance checks are pending.
