# Foundation tasks

## Remaining work

- [x] 000.01 Add the Tauri 2 shell for Linux with a typed native service boundary. Check: `bun tauri dev` opens the app on Fedora 44.
- [x] 000.02 Add TanStack Router with a root layout and app shell template. Check: routes render inside the shell and unknown routes show a not-found view.
- [x] 000.03 Add the CodeMirror 6 base editor inside the Markdown feature module. Check: a buffer edits, undoes, and redoes in the shell.
- [x] 000.04 Add Vitest with fixtures and run `bun run test` in CI. Check: CI fails on a failing test.
- [x] 000.05 Package for Fedora 44 as an RPM through the Tauri bundler and publish it as a CI artifact. Check: the RPM installs and launches on Fedora 44.
- [x] 000.06 Set up the atomic folder layout and feature module convention. Check: shared components live under atoms, molecules, organisms, and templates, and AGENTS.md documents the convention.
- [x] 000.07 Replace the native window decorations with a custom title bar. Check: on Fedora 44 the window opens without the system title bar, drags from the header, resizes from its edges, and minimize, maximize and close work by mouse and keyboard.
- [x] 000.08 Version the app from `package.json` and bump to 0.2.0. Check: the RPM is `re-edit-0.2.0-1`, upgrades 0.1.0, and the crate version matches (`crate_version_matches_package_json`).
- [x] 000.09 Add an interface size setting (100%, 112.5%, 125%, 150%) with Ctrl+=, Ctrl+-, and Ctrl+0. Check: each size scales the whole interface without clipping and survives a restart.
- [x] 000.10 Hide the webview's own context menu (Back, Forward, Stop, Reload, Inspect Element) outside text fields, the editor, and selected text. Check: plain surfaces show nothing on right-click, text keeps Copy/Paste and spelling, and the tab menu still opens. Added on request.
