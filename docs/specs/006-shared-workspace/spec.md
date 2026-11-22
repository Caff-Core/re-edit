# Shared document workspace

## Outcome

Open, edit, switch, save, and close any registered document type, text or binary, through one workspace that never depends on a feature's internal state.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-012 | Read and write every document as bytes through the native file service. Text types share one codec that keeps the encoding (UTF-8, UTF-8 with a byte order mark, or UTF-16 with a byte order mark), the byte order mark, and the line endings. A file in any other encoding opens to a clear message and is never decoded with replacement characters. | AC-012. Open a UTF-8 file with a byte order mark and Windows line endings, edit one line, and save: every other byte is unchanged. Round-trip a UTF-16 file. Open a Windows-1252 file and see the unsupported-encoding message with no tab content created. |
| REQ-013 | Route Save, Save As, Close, Undo, Redo, Find, and Format Document to the active editor through its handle, and show only the commands it supports. Each type names its primary save action. Opening a file that is already open focuses its tab. | AC-013. Open a Markdown file and a second document type together, edit both, and switch between them: each tab keeps its own content, undo history, and dirty status, and saving the active tab writes only that file. Registering a test document type needs no edits inside the Markdown feature. |
| REQ-014 | Keep the buffer through cancelled saves, failed writes, and outside changes for every type. When a file changes on disk while its tab has unsaved edits, offer Keep editing, Reload (after confirmation), and Save a copy. Recover each dirty document after a restart from a draft its feature produces. | AC-014. With a dirty tab of each type, change the file outside the app and use each choice; cancel a save and fail a write; restart and restore both drafts. |

## Verification status

Automated checks ran on 2026-11-22 (Vitest and `cargo test` on Fedora 44); the packaged walkthrough (006.04) has not run yet.

| Acceptance | Automated | Packaged Fedora 44 |
|---|---|---|
| AC-012 | Pass: codec round trips (`src/lib/text-codec.test.ts`), byte-exact save and Windows-1252 refusal (`src/app/workspace.test.tsx`), byte commands (`src-tauri/src/native/files.rs`) | Not run yet |
| AC-013 | Pass: two types side by side with routed Undo and single-file Save (`src/app/workspace.test.tsx`) | Not run yet |
| AC-014 | Pass: Keep editing, Reload with confirmation, Save a copy, deleted file, drafts of both types, changed-since-draft conflict, copy-mode save, cancelled save (`src/app/workspace.test.tsx`) | Not run yet |
