# Structured configuration files plan

## Design

`src/features/config` registers three types (JSON, YAML, TOML) on the shared CodeMirror pieces and the text codec.

- **Highlighting and diagnostics.** `@codemirror/lang-json` and `@codemirror/lang-yaml`, and a TOML stream language. Diagnostics come from each format's parser through `@codemirror/lint`, with line and column in the message and in the lint panel.
- **Format Document** (routed by the workspace, 006). JSON and YAML use Prettier's standalone build, which keeps YAML comments. TOML uses Taplo's WebAssembly formatter, which keeps comments. Before applying a result, the feature parses old and new text and compares the values; any difference, or a parse error, cancels the change with a diagnostic. Formatting is one undoable edit.
- JSON with comments (JSONC) is not in scope; a `.json` file with comments reports them as errors.

## Verification

Planned checks: a valid and an invalid fixture per format with the expected line and column; formatting fixtures with comments, comparing parsed values before and after; refusal on invalid input and on a value-changing result; undo of a format.
