import type { ComponentType, Ref } from "react"

import type { LocalizedText } from "@/lib/i18n"

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
  /**
   * Replaces the whole buffer with `content` as one undoable edit and records
   * `saved` as the saved version (used to load a file changed on disk).
   */
  replaceContent(content: string, saved: string): void
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
  /** Path on disk, or null while the document is untitled. */
  path: string | null
  /**
   * Turns a relative asset reference (for example an image source) into a
   * data URL, resolved against the document's folder. Rejects with a
   * readable message when the asset cannot be shown.
   */
  resolveAsset: (src: string) => Promise<string>
  ref?: Ref<DocumentEditorHandle>
}

export interface DocumentType {
  /** Stable identifier, for example "markdown". */
  id: string
  /** Name shown in menus, for example "Markdown document". */
  label: LocalizedText
  /** Title for new documents, numbered when repeated. */
  defaultTitle: LocalizedText
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
  /** Modification time of the disk version this tab is based on. */
  modifiedMs: number | null
}
