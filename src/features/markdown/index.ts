// Public API. The editor components load lazily through markdownDocumentType,
// so they are not exported here: a static export would pull CodeMirror into
// the startup bundle.
export { markdownDocumentType } from "./document-type"
export { EditorPreferencesForm } from "./components/editor-preferences-form"
export type { EditorStatus } from "./lib/extensions"
export type { EditorPreferences } from "./lib/preferences"
