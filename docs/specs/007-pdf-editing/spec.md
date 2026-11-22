# PDF editing

## Outcome

Open a local PDF, annotate it, fill its form, rearrange its pages, and save an edited copy that any PDF viewer shows the same way, while the source file stays untouched.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-015 | Open local PDFs with page thumbnails, zoom, and page navigation by keyboard and pointer. Encrypted or otherwise unsupported files that cannot be modified safely open to a clear error, never a partial edit. | AC-015. Open a multi-page fixture, move between pages with thumbnails and the keyboard, and zoom in and out. Open an encrypted fixture and see the error. |
| REQ-016 | Highlight selectable text, and add comments and text boxes. Select, edit, move, and delete annotations added in the editor. Scanned pages without a text layer support page tools and text boxes. Existing annotations are kept where the engine supports them. | AC-016. Highlight text, add a comment and a text box, move and edit the text box, delete the comment, and add a text box to a scanned page. |
| REQ-017 | Fill existing standard form fields: text fields, checkboxes, radio buttons, and dropdowns. Other field types show a clear "not supported" message and keep their value. | AC-017. Fill one field of each supported kind, and see the message on an unsupported field. |
| REQ-018 | Reorder, rotate, and delete pages, with menu and keyboard alternatives to dragging. The final page cannot be deleted. Each page keeps a stable identity, so its annotations and form values follow it. | AC-018. Reorder pages by keyboard and by drag, rotate one, delete one, try to delete the last remaining page, and confirm every annotation stays on its page. |
| REQ-019 | Undo and redo annotations, form changes, and page operations. The primary save is Save Edited Copy: the source file is not modified unless the user explicitly saves over it and confirms. Cancelled and failed saves keep every edit. | AC-019. Fill a form, add a highlight and a text box, rotate and reorder pages, and save an edited copy. Reopen the copy in an independent viewer: edits persist, annotations are on the right pages, and the source is byte-identical. Exercise undo, a cancelled save, and a failed save. |

Deferred for the first release: replacing existing page text and images, optical character recognition, redaction, and digital signature editing.

## Verification status

Planned. Nothing recorded yet.

| Acceptance | Result |
|---|---|
| AC-015 | Planned |
| AC-016 | Planned |
| AC-017 | Planned |
| AC-018 | Planned |
| AC-019 | Planned |
