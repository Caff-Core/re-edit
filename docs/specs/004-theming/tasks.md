# Themes, motion, and accessibility tasks

## Remaining work

- [x] 004.05 Add the theme catalog, theme preview, and four motion presets. Added because 004.01 and 004.02 assumed them. (REQ-007, REQ-008, AC-007, AC-008)
- [x] 004.01 Verify rapid hover, keyboard dismissal, focus restoration, and persisted selection across themes. (REQ-007, AC-007) Covered by `src/app/themes.test.tsx`; the packaged run is part of 004.04.
- [x] 004.02 Extend the four motion presets to remaining shared surfaces. (REQ-008, AC-008)
- [x] 004.03 Localize labels and status text, then perform Fedora keyboard, contrast, and screen-reader checks. (REQ-009, AC-009) Contrast is checked automatically; the Orca walkthrough runs with 004.04.
- [x] 004.04 Run the integrated acceptance walkthrough and record results for AC-007, AC-008, AC-009.
- [x] 004.06 Add Dracula, Nord, Gruvbox Light, Gruvbox Dark, Catppuccin Latte, and Catppuccin Mocha. Check: each previews, commits, survives a restart, and passes the contrast test. Added on request.
- [x] 004.09 Add a Neon theme (magenta, cyan, green, and yellow on a near-black blue base). Check: it previews, commits, survives a restart, and passes the contrast test. Added on request.
- [x] 004.07 Show the motion, language, and font size choices as button groups with icons (ReUI c-button-group-3) through the `ChoiceGroup` molecule. Added on request.
