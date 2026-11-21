import { StateEffect } from "@codemirror/state"

/** Message for screen readers, read by the document's live region. */
export const announce = StateEffect.define<string>()
