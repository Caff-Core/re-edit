# Core editor plan

## Design

Keep CodeMirror extensions inside the Markdown feature. Compose editor controls from atomic components and expose shared document metadata through the workspace contract.

## Scaffold status

001.01 is in place: keyboard formatting, find and replace, accessible table operations with live announcements, and editor preferences. 001.02 (document registry and tab contract) is not started.

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
