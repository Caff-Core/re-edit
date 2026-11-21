# Core editor plan

## Design

Keep CodeMirror extensions inside the Markdown feature. Compose editor controls from atomic components and expose shared document metadata through the workspace contract.

## Scaffold status

001.01 and 001.02 are in place. The workspace (`src/workspace`) owns document identity, tab order, titles, dirty display, and saving through a `DocumentStore`. Each document type implements the `DocumentType` contract: its editor reports dirty state and serializes its own content. Markdown registers in `src/app/document-types.ts`; a plain-text type in `src/test/fixtures/document-types` proves the contract in tests. Saving uses an in-memory store until 003 adds the native one.

## Keyboard map

| Action | Shortcut |
|---|---|
| Bold, italic, inline code, link | Ctrl+B, Ctrl+I, Ctrl+E, Ctrl+K |
| Heading level 1 to 6 | Ctrl+Alt+1 to Ctrl+Alt+6 |
| Find and replace | Ctrl+F |
| Insert table | Ctrl+Alt+T |
| Add row below, add column right | Ctrl+Enter, Ctrl+Shift+Enter (in a table) |
| Delete row, delete column | Ctrl+Alt+Backspace, Ctrl+Alt+Shift+Backspace (in a table) |
| Next cell, previous cell | Alt+Right, Alt+Left (in a table) |
| Undo, redo | Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z |

Tab is not bound, so focus can always leave the editor. Table commands announce the result in a live region.

## Verification

Use the criteria in [spec.md](spec.md) and complete the integrated check in [tasks.md](tasks.md) in the packaged Fedora 44 application. Record pass or fail with the tested build and evidence.
