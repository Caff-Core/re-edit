# Shared document workspace plan

## Design

The workspace owns document identity, paths, titles, tab order, dirty display, close prompts, drafts, conflicts, and command routing. A feature owns decoding, editing, undo history, validation, and encoding. Nothing in `src/workspace` imports a feature.

- **Bytes in, bytes out.** `DocumentType.load(bytes)` returns the feature's document or throws a typed `UnsupportedDocument` error with a message for the user. The editor handle's `serialize()` resolves to the bytes to write. New documents start from `createEmpty()` bytes.
- **Text codec.** `decodeText(bytes)` returns the text plus a `TextFormat` (encoding, byte order mark, line ending). `encodeText(text, format)` writes it back the same way. It lives in `src/lib/text-codec.ts`, so every text feature shares it and none depends on another.
- **Drafts.** The handle's `draft()` returns a string the feature can restore from: the text for text types, an edit log for PDF. The workspace stores it with the document's path and modification time. A draft whose source changed since is offered with a warning, never applied silently.
- **Commands.** The handle reports `capabilities` (a subset of Save, Save As, Undo, Redo, Find, Format Document). The workspace toolbar and menu show only those, and call them through the handle. Format-specific tools stay in the feature's own toolbar.
- **Primary save.** `DocumentType.save` describes the first save of a file opened from disk: `"in-place"` (text types) or `"copy"` (PDF: "Save Edited Copy", suggesting `name (edited).pdf`). After a copy is written, the tab points at the copy.
- **Native service.** New host commands `read_file` and `write_file` move bytes with the existing scope rules, atomic writes, and conflict check. Text keeps the 20 MB limit; binary types set their own limit (PDF: 200 MB, confirmed in 007).

## Scaffold status

Before this milestone (checked in the code on 2026-11-22): the workspace already owns identity, titles, tab order, dirty display, close prompts, conflicts (Keep my version, Use disk version, Open disk version), atomic text saves, drafts in local storage, and focusing an already-open file (`src/workspace/workspace-provider.tsx`). Editors stay mounted per tab, so undo history survives switching. The contract is text only (`initialContent: string`, `serialize(): string`), the host reads UTF-8 only, and no byte order mark or line ending is tracked. 006 replaces the contract and adds the codec, routing, and conflict choices above.

After 006.01 to 006.03: the host has `read_file` (raw bytes with the modification time in an 8-byte prefix) and `write_file` (raw body, path in a percent-encoded header); the text-only commands are gone. `src/lib/text-codec.ts` and `src/lib/text-document.ts` give every text type the same decoding, drafts, and byte-faithful saves. Markdown and the test type use the byte contract. The File menu shows the active document's Undo, Redo, Find, and Format document when it supports them. Conflicts offer Keep editing, Reload (confirmed, undoable), and Save a copy; the old Keep my version, Use disk version, and Open disk version are replaced. Drafts record the version they were made against and come back as a conflict when the file changed since.

## Verification

Planned checks: codec round trips for every supported encoding and line ending, refusal of unsupported encodings, routing and per-tab isolation with Markdown and the test type, conflict choices, and draft recovery for both types. The Markdown regression suite runs unchanged. The packaged Fedora 44 check covers native dialogs and binary saves.
