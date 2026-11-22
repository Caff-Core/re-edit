# Themes, motion, and accessibility

## Outcome

Preview and commit light or dark themes, choose motion preferences, and access essential tasks by keyboard or screen reader.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-007 | Provide System, Default Light, Default Dark, Solarized Light, and Solarized Dark. Start preview on hover or keyboard highlight, commit on click or Enter, and restore on dismissal. | AC-007. Preview multiple themes rapidly, dismiss the list, commit a theme by keyboard, and verify only the committed value survives restart. |
| REQ-008 | Provide None, Subtle, Normal, and Bouncy with immediate application. Apply None when system reduced motion is enabled. | AC-008. Select each motion mode, inspect theme transitions, enable system reduced motion, and verify focus and editing remain immediate. |
| REQ-009 | Provide English and Simplified Chinese interface strings and meet the WCAG 2.2 AA design target. | AC-009. Run the core flow using keyboard and screen reader, inspect contrast and focus in every theme, and verify both language settings. |

## Verification status

Packaged Fedora 44 walkthrough, recorded 2026-11-22.

- Build: re-edit 0.2.0-1 RPM (commit 87835b7), installed with `dnf` on Fedora 44 (Linux 7.3), with chromium-157.0.8103.78-1.fc44.
- Steps: the walkthrough checklist on #20.
- Evidence: run by the maintainer, who reported "All good" for the walkthroughs. No per-step notes or screenshots were recorded.

| Acceptance | Result |
|---|---|
| AC-007 | Pass |
| AC-008 | Pass |
| AC-009 | Pass |
