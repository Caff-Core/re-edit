# Delimited tables

## Outcome

Edit CSV and TSV files in a keyboard-friendly grid and save them back without disturbing quoting, line breaks, or values.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-024 | Show `.csv` and `.tsv` files in a grid that works fully by keyboard: move between cells, edit a cell, paste a rectangular range, insert and delete rows and columns, and undo and redo each change. Whether the first row is a header is an explicit choice. | AC-024. By keyboard: edit cells, paste a 3 by 2 range from the clipboard, insert and delete a row and a column, toggle the header row, and undo and redo each step. |
| REQ-025 | Keep quoted separators, embedded line breaks, empty cells, leading zeros, and the original delimiter, and treat every value as text. Malformed input is explained, with its location, before anything would rewrite it. | AC-025. Round-trip fixtures with quoted commas, multi-line cells, empty cells, and leading zeros: unchanged bytes when nothing is edited. Open a malformed fixture and read the explanation before any save changes it. |

## Verification status

Planned. Nothing recorded yet.

| Acceptance | Result |
|---|---|
| AC-024 | Planned |
| AC-025 | Planned |
