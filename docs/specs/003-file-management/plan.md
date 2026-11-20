# File management plan

## Design

Keep shared path and dialog operations in the native service and state such as open document IDs in the workspace. Make writes atomic, isolate recovery per document, and scope file watches to selected folders.

## Scaffold status

Not started. Depends on 000.01 (Tauri shell and native service boundary) and 001.02 (document registry and tab contract).

## Verification

Use the criteria in [spec.md](spec.md) and complete the integrated check in [tasks.md](tasks.md) in the packaged Fedora 44 application. Record pass or fail with the tested build and evidence.
