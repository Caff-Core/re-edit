# File management plan

## Design

Keep shared path and dialog operations in the native service and state such as open document IDs in the workspace. Make writes atomic, isolate recovery per document, and scope file watches to selected folders.

## Scaffold status

003.01 is in place. Native file commands in `src-tauri/src/native/files.rs` only touch files and folders picked in a native dialog (`FileScope`, persisted in the app data folder; `..` and escaping symlinks are rejected). The workspace opens files into tabs, lists the open folder in a tree, saves to disk with Save and Save As, keeps eight recent files and folders, and stores the session with a draft of every dirty document, restored after a restart. 003.02 makes saves atomic (temporary file, fsync, rename, permissions kept; a failed write leaves the file and the buffer as they were) and refuses to overwrite a newer disk version. Open documents are watched (their folders, so replaced files are seen); a clean tab reloads with a notice, and a dirty tab shows a conflict with Keep my version, Use disk version (undoable), and Open disk version. A file deleted on disk keeps its text and can be saved again. The browser build uses an in-memory sample folder.

## Verification

Use the criteria in [spec.md](spec.md) and complete the integrated check in [tasks.md](tasks.md) in the packaged Fedora 44 application. Record pass or fail with the tested build and evidence.
