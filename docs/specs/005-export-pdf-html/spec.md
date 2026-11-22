# Direct PDF and HTML export

## Outcome

Save the current buffer as a standalone HTML document or a paginated PDF with a single destination chooser.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-010 | Export standalone HTML with document styles and supported local assets embedded. | AC-010. Export from an unsaved buffer, disconnect networking, open the HTML, and verify code, tables, math, diagrams, and images. |
| REQ-011 | Export PDF directly to the selected path with consistent page breaks and no print dialog. | AC-011. On Fedora 44, export the same fixture to PDF, verify text and styles across page breaks, and confirm cancel and renderer failures preserve the buffer and destination. |

## Verification status

Packaged Fedora 44 walkthrough, recorded 2026-11-22.

- Build: re-edit 0.2.0-1 RPM (commit 87835b7), installed with `dnf` on Fedora 44 (Linux 7.3), with chromium-157.0.8103.78-1.fc44.
- Steps: the walkthrough checklist on #23.
- Evidence: run by the maintainer, who reported "All good" for the walkthroughs. No per-step notes or screenshots were recorded.

| Acceptance | Result |
|---|---|
| AC-010 | Pass |
| AC-011 | Pass |
