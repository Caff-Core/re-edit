# Plain text

## Outcome

Edit `.txt` files with the same editing comfort as Markdown, and save them back byte for byte except for what the user changed.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-020 | Edit plain text on the shared CodeMirror foundation with undo and redo, find and replace, line wrapping, and live word and character counts that screen readers can reach. | AC-020. By keyboard only: find and replace a word, undo and redo it, toggle wrapping, and read the word and character counts. |
| REQ-021 | Keep the encoding, byte order mark, and line endings on save. Files in unsupported encodings open to a clear message and are never silently changed. | AC-021. Open, edit, and save a file with non-ASCII text and Windows line endings; reopen it and confirm the characters and line endings are unchanged. Open an unsupported encoding and see the message. |

## Verification status

Automated checks ran on 2026-11-22 (Vitest, and a headless Chromium run of the browser build); the packaged walkthrough (008.04) has not run yet.

| Acceptance | Automated | Packaged Fedora 44 |
|---|---|---|
| AC-020 | Pass: find and replace with Ctrl+F, Undo from the File menu, counts that update after typing and are a Tab stop after the editor (`text-editor.test.tsx`); counts for accented, emoji, and Chinese text (`lib/counts.test.ts`) | Not run yet (Orca reading the counts) |
| AC-021 | Pass: UTF-8 with a byte order mark and CRLF saved byte for byte after an edit; mixed line endings explained; Windows-1252 refused with no tab (`text-editor.test.tsx`); codec round trips for every supported encoding (`src/lib/text-codec.test.ts`) | Not run yet |
