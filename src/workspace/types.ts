import type { ComponentType, Ref } from "react"

import type { Locale, LocalizedText } from "@/lib/i18n"

/**
 * Contract between the workspace and a document feature. The workspace owns
 * identity, tab order, titles, file paths, dirty display, saving, drafts,
 * conflicts, and command routing. The feature owns decoding, editing, undo
 * history, dirty detection, validation, and encoding. Content crosses the
 * boundary as bytes, so text and binary formats share one path.
 */

/** Commands the workspace routes to the active editor when it supports them. */
export type DocumentCommand = "undo" | "redo" | "find" | "format"

/**
 * The commands an editor supports right now: a key is present when the
 * command exists for this document, and its value says whether it can run.
 */
export type DocumentCommandState = Partial<Record<DocumentCommand, boolean>>

/** What a save writes, and the token that marks that version as saved. */
export interface SerializedDocument {
  bytes: Uint8Array
  /** Passed back to `markSaved` once the bytes are on disk. Opaque to the workspace. */
  token: unknown
}

export interface DocumentEditorHandle {
  /** The document in its file format, ready to write. */
  serialize(): Promise<SerializedDocument>
  /**
   * Records the version `token` stands for as saved. The editor reports
   * clean only while it still matches, so edits made during a save stay dirty.
   */
  markSaved(token: unknown): void
  /**
   * Replaces the whole document with `bytes` from disk as one undoable step
   * and records it as saved. Throws an UnsupportedDocumentError when the
   * bytes cannot be loaded; the document is then unchanged.
   */
  replaceContent(bytes: Uint8Array): void | Promise<void>
  /** A string the type's `fromDraft` can restore unsaved work from. */
  draft(): string
  /** Runs a routed command. Returns false when the editor does not support it. */
  run(command: DocumentCommand): boolean
  focus(): void
}

export interface DocumentEditorProps<D = unknown> {
  documentId: string
  title: string
  /** The document the editor starts with (a recovered draft or the file). */
  initial: D
  /** The last saved version; differs from `initial` for a recovered draft. */
  saved: D
  /** Called whenever the document becomes dirty or clean. */
  onDirtyChange: (dirty: boolean) => void
  /** Called after any edit, so the workspace can store a recovery draft. */
  onEdit: () => void
  /** Called whenever the routed commands the editor supports, or can run, change. */
  onCommandsChange?: (commands: DocumentCommandState) => void
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

export interface DocumentExportContext {
  title: string
  /** Interface language, for any text the export adds. */
  locale: Locale
  /** Resolves a local asset to a data URL, as for the preview. */
  resolveAsset: (src: string) => Promise<string>
}

/** Turns a document into standalone HTML for HTML and PDF export. */
export interface DocumentExporter {
  /** A complete page that embeds everything it shows and loads nothing. */
  toStandaloneHtml(
    bytes: Uint8Array,
    context: DocumentExportContext
  ): Promise<string>
}

/**
 * How the first save of a file opened from disk works. "in-place" writes the
 * file; "copy" asks for a new path (PDF's Save Edited Copy) and the tab then
 * follows the copy.
 */
export type SaveMode = "in-place" | "copy"

export interface DocumentType<D = unknown> {
  /** Stable identifier, for example "markdown". */
  id: string
  /** Name shown in menus, for example "Markdown document". */
  label: LocalizedText
  /** Title for new documents, numbered when repeated. */
  defaultTitle: LocalizedText
  /** File extensions this type opens, lowercase with the dot. The first is the default. */
  extensions: string[]
  /** Largest file this type opens, in bytes. Defaults to 20 MB; the host caps it at 200 MB. */
  maxBytes?: number
  /**
   * Decodes a file. Throws (or rejects with) an UnsupportedDocumentError when
   * the file cannot be edited without changing or losing parts of it. May be
   * async for formats whose engine starts asynchronously, such as PDF.
   */
  load(bytes: Uint8Array): D | Promise<D>
  /** A new, empty document. Absent for formats that cannot start empty, such as PDF. */
  createEmpty?(): D
  /** Restores unsaved work from `draft()`, given the saved version (or an empty document). */
  fromDraft(draft: string, saved: D): D
  /** Defaults to "in-place". */
  save?: SaveMode
  /** Label of the primary save action when it differs from "Save". */
  saveLabel?: LocalizedText
  Editor: ComponentType<DocumentEditorProps<D>>
  /** Present when the type can be exported to HTML and PDF. */
  exporter?: DocumentExporter
}

/**
 * Registers a typed document type. The registry holds types of every
 * document shape, so it sees them as `DocumentType<unknown>`.
 */
export const defineDocumentType = <D>(type: DocumentType<D>): DocumentType =>
  type as unknown as DocumentType

export interface OpenDocument {
  id: string
  typeId: string
  title: string
  /** Absolute path on disk, or null for a document that was never saved. */
  path: string | null
  /** The feature's document the editor starts from. */
  initial: unknown
  /** The last saved version, the editor's dirty baseline. */
  saved: unknown
  dirty: boolean
  /** Modification time of the disk version this tab is based on. */
  modifiedMs: number | null
  /**
   * True until the first save of a "copy" type opened from disk, so that
   * save asks for a new path and leaves the source untouched.
   */
  copyPending: boolean
  /**
   * The draft this tab was restored from, kept for the session until its
   * editor has loaded and can produce a fresh one.
   */
  restoredDraft: string | null
}
