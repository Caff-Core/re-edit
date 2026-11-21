import type { ComponentType, Ref } from "react"

/**
 * Contract between the workspace and a document feature. The workspace owns
 * identity, tab order, titles, file paths, dirty display, saving, and draft
 * recovery. The feature owns parsing, editing, undo history, dirty detection,
 * and serialization.
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
  /** Content the editor starts with (a recovered draft or the file). */
  initialContent: string
  /** Last saved content; differs from initialContent for a recovered draft. */
  savedContent: string
  /** Called whenever the document becomes dirty or clean. */
  onDirtyChange: (dirty: boolean) => void
  /** Called after any edit, so the workspace can store a recovery draft. */
  onEdit: () => void
  ref?: Ref<DocumentEditorHandle>
}

export interface DocumentType {
  /** Stable identifier, for example "markdown". */
  id: string
  /** Name shown in menus, for example "Markdown document". */
  label: string
  /** Title for new documents, numbered when repeated. */
  defaultTitle: string
  /** File extensions this type opens, lowercase with the dot. The first is the default. */
  extensions: string[]
  createEmpty(): string
  Editor: ComponentType<DocumentEditorProps>
}

export interface OpenDocument {
  id: string
  typeId: string
  title: string
  /** Absolute path on disk, or null for a document that was never saved. */
  path: string | null
  initialContent: string
  savedContent: string
  dirty: boolean
}
