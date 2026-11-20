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

Packaged Fedora 44 acceptance checks are pending.
