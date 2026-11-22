# Delimited tables plan

## Design

`src/features/tables` registers CSV (comma) and TSV (tab), decoding with the shared text codec.

- **Parser and writer.** A small RFC 4180 parser of its own that records, per file, the delimiter, the quote style of each field, and the line ending, so an unedited file writes back byte for byte and edited cells are quoted only when they need it. Every value stays a string. Malformed input (an unclosed quote, a stray quote, ragged rows) is reported with its row and column; the grid opens read-only until the user confirms how to repair it.
- **Grid.** The project rule is that tables use ReUI's `data-grid`. 010.02 starts by checking whether it supports spreadsheet-style cell editing, a cell cursor, and range paste. If it does not, the gap is raised with the maintainer before choosing anything else, rather than worked around.
- **Undo** covers cell edits, range pastes, row and column changes, and the header toggle, each as one step.
- The header choice is a per-file setting in the feature's toolbar, stored with the document draft.

## Verification

Planned checks: byte-identical round trips of the fixtures, quoting of edited cells, malformed-input reports with locations, range paste shapes (including a paste larger than the grid), undo and redo of each operation, and keyboard navigation.
