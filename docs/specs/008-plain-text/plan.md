# Plain text plan

## Design

`src/features/plain-text` registers `.txt`. It decodes with the shared text codec from 006 and keeps the `TextFormat` it returns, so saving writes the same encoding, byte order mark, and line endings. CodeMirror normalises line endings in memory; the codec restores the file's own on save. A file with mixed line endings keeps the dominant one and says so once in a notice.

The editor reuses the shared CodeMirror pieces (history, search, wrapping, theme variables, editor preferences) without importing the Markdown feature: shared editor pieces that both need move to `src/lib/codemirror`. Word and character counts show in a status line under the editor, as a polite live region updated after typing pauses.

The test fixture type in `src/test/fixtures/document-types` stays, as the proof that registering a type needs no Markdown edits.

## Verification

Planned checks: codec round trips for UTF-8, UTF-8 with a byte order mark, and UTF-16 with Windows and Unix line endings; refusal of an unsupported encoding; count accuracy (including non-ASCII words); keyboard find and replace. The packaged Fedora 44 check reopens a saved file and compares bytes.
