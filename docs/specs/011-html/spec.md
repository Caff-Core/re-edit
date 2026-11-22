# HTML

## Outcome

Edit HTML source with a live preview that cannot run code, reach the network, or touch the app, and save exactly the source that was written.

## Requirements and acceptance

| Requirement | Behavior | Acceptance |
|---|---|---|
| REQ-026 | Edit `.html` and `.htm` source with syntax highlighting and a live preview that updates as you type. Saving writes the source buffer, including markup the preview ignores. | AC-026. Edit an HTML file and watch the preview update; save and reopen it, and confirm the source matches byte for byte, including scripts and comments the preview did not run. |
| REQ-027 | Sandbox the preview: no scripts, no network requests, no navigation of the workspace, and no access to native commands. | AC-027. Preview a fixture with an inline script, an event handler, a remote image, a form, a link with `target="_top"`, and a call to the app's native bridge: none of them runs, loads, or navigates. |

## Verification status

Planned. Nothing recorded yet.

| Acceptance | Result |
|---|---|
| AC-026 | Planned |
| AC-027 | Planned |
