# Structured configuration files

## Outcome

Edit JSON, YAML, and TOML files with highlighting, precise error locations, and a formatter that never changes a value or drops a comment.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-022 | Highlight `.json`, `.yaml`, `.yml`, and `.toml` sources and show diagnostics with line and column. Invalid drafts stay editable and saveable. | AC-022. For each format, open a valid and an invalid fixture: the invalid one shows a diagnostic at the right line and column, and it can still be edited and saved. |
| REQ-023 | Format Document runs only when asked. It keeps every parsed value and every comment the format supports. When formatting cannot run safely (invalid input, or a result that would change a value), it shows a diagnostic and leaves the text alone. | AC-023. Format a fixture of each format with comments: the values parse the same before and after, and the comments remain. Try to format an invalid fixture and see the diagnostic with the text unchanged. |

## Verification status

Planned. Nothing recorded yet.

| Acceptance | Result |
|---|---|
| AC-022 | Planned |
| AC-023 | Planned |
