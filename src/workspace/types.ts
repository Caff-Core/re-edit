import type { ComponentType, Ref } from "react"

/**
 * Contract between the workspace and a document feature. The workspace owns
 * identity, tab order, titles, and dirty display. The feature owns parsing,
 * editing, undo history, dirty detection, and serialization.
 */
export interface DocumentEditorHandle {
  /** Current content in the format the feature saves. */
  serialize(): string
  /**
   * Records `content` as the saved version. The feature reports clean only
   * while its content equals it, so edits made during a save stay dirty.
   */
  markSaved(content: string): void
  focus(): void
}

export interface DocumentEditorProps {
  documentId: string
  title: string
  initialContent: string
  /** Called whenever the document becomes dirty or clean. */
  onDirtyChange: (dirty: boolean) => void
  ref?: Ref<DocumentEditorHandle>
}

export interface DocumentType {
  /** Stable identifier, for example "markdown". */
  id: string
  /** Name shown in menus, for example "Markdown document". */
  label: string
  /** Title for new documents, numbered when repeated. */
  defaultTitle: string
  /** File extensions this type opens, lowercase with the dot. */
  extensions: string[]
  createEmpty(): string
  Editor: ComponentType<DocumentEditorProps>
}

export interface OpenDocument {
  id: string
  typeId: string
  title: string
  initialContent: string
  dirty: boolean
}

export interface DocumentRef {
  id: string
  typeId: string
  title: string
}

/** Where saved content goes. File management (003) supplies the native store. */
export interface DocumentStore {
  write(document: DocumentRef, content: string): Promise<void>
}
