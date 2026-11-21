# Direct PDF and HTML export tasks

## Remaining work

- [x] 005.04 Add standalone HTML export and the direct PDF export path. Added because 005.01 and 005.02 assumed them. (REQ-010, REQ-011, AC-010, AC-011)
- [x] 005.01 Inline local assets and share completed math and Mermaid renderers with the export pipeline. (REQ-010, AC-010)
- [x] 005.02 Verify Chromium dependency handling, path cancellation, destination write integrity, and pagination in the packaged Fedora app. (REQ-011, AC-011) The RPM recommends `chromium`; the packaging job renders a long sample with Fedora 44's Chromium through the same code as the app and checks pages, text, fonts, and failure integrity. Cancel and failures in the running app are covered by workspace tests and the 005.03 walkthrough.
- [ ] 005.03 Run the integrated acceptance walkthrough and record results for AC-010, AC-011.
