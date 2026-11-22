# Plain text

## Outcome

Edit `.txt` files with the same editing comfort as Markdown, and save them back byte for byte except for what the user changed.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-020 | Edit plain text on the shared CodeMirror foundation with undo and redo, find and replace, line wrapping, and live word and character counts that screen readers can reach. | AC-020. By keyboard only: find and replace a word, undo and redo it, toggle wrapping, and read the word and character counts. |
| REQ-021 | Keep the encoding, byte order mark, and line endings on save. Files in unsupported encodings open to a clear message and are never silently changed. | AC-021. Open, edit, and save a file with non-ASCII text and Windows line endings; reopen it and confirm the characters and line endings are unchanged. Open an unsupported encoding and see the message. |

## Verification status

Planned. Nothing recorded yet.

| Acceptance | Result |
|---|---|
| AC-020 | Planned |
| AC-021 | Planned |
