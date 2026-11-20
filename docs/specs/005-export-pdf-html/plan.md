# Direct PDF and HTML export plan

## Design

Share rendering policy with preview. Use a Tauri Linux command to render HTML through a sandboxed Chromium process with a temporary profile and bounded run time. Write the rendered bytes to the user-selected path after successful conversion.

## Scaffold status

Not started. Depends on 000.01 (Tauri shell), 000.05 (Fedora packaging), and 002.02 (math and Mermaid renderers).

## Verification

Use the criteria in [spec.md](spec.md) and complete the integrated check in [tasks.md](tasks.md) in the packaged Fedora 44 application. Record pass or fail with the tested build and evidence.
