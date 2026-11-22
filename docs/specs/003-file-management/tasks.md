# File management tasks

## Remaining work

- [x] 003.01 Implement the folder tree, tabs, recents, and per-document draft recovery. (REQ-005, AC-005)
- [x] 003.02 Implement atomic save and an explicit conflict flow for watched paths. (REQ-006, AC-006)
- [x] 003.03 Run the integrated acceptance walkthrough and record results for AC-005, AC-006.
- [x] 003.04 Add an auto save setting (off by default). Check: edits to an opened file reach disk one second after the last edit; a conflict or failed save pauses it; untitled documents stay drafts. Added on request.
- [x] 003.05 Add a setting to show or hide folder tree branch lines (on by default), using ReUI's indent-lines pattern. Check: lines show per level in every theme, hide when off, and the choice survives a restart. Added on request.
- [x] 003.06 Add Close others, Close to the left, Close to the right, and Close all to a tab context menu. Check: each command closes the expected tabs, the nearest remaining tab stays active, unsaved tabs ask once, and the menu opens from the keyboard. Added on request.
