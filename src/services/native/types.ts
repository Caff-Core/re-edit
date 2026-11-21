/**
 * Contract for every operation the frontend requests from the desktop host.
 * Shapes mirror the Rust types in `src-tauri/src/native`.
 */
export interface AppInfo {
  name: string
  version: string
  platform: string
}

export interface TextFile {
  content: string
  modifiedMs: number
}

export interface FolderEntry {
  path: string
  name: string
  /** Path of the containing folder. */
  parent: string
  kind: "file" | "folder"
}

export interface FolderListing {
  root: string
  entries: FolderEntry[]
  /** True when the folder was too large or deep to list completely. */
  truncated: boolean
}

export interface FileStat {
  exists: boolean
  modifiedMs: number
}

/**
 * Kinds of file errors. The host reports the first six; "unavailable" (no
 * host, in a plain browser) and "unsaved" (a document with no folder yet)
 * come from the frontend.
 */
export type FileErrorKind =
  | "outsideScope"
  | "notFound"
  | "tooLarge"
  | "notText"
  | "conflict"
  | "io"
  | "unavailable"
  | "unsaved"

/** A file operation failure with the host's error kind. */
export class FileError extends Error {
  readonly kind: FileErrorKind
  constructor(kind: FileErrorKind, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "FileError"
    this.kind = kind
  }
}

export const isConflict = (error: unknown) =>
  error instanceof FileError && error.kind === "conflict"

export interface ImageData {
  mime: string
  base64: string
}

/** File access through native dialogs, limited to paths the user picked. */
export interface FileService {
  /** Returns null when the user cancels. */
  pickOpenFile(extensions: string[]): Promise<string | null>
  pickFolder(): Promise<string | null>
  pickSavePath(suggestedName: string): Promise<string | null>
  readTextFile(path: string): Promise<TextFile>
  /**
   * Writes atomically and returns the new modification time. With
   * `expectedModifiedMs`, fails with a "conflict" FileError when the file on
   * disk is not that version.
   */
  writeTextFile(
    path: string,
    content: string,
    expectedModifiedMs?: number | null
  ): Promise<number>
  statFile(path: string): Promise<FileStat>
  /** Replaces the set of watched files (paths of open documents). */
  watchPaths(paths: string[]): Promise<void>
  /** Calls `listener` with the path of a watched file that changed. */
  onFileChanged(listener: (path: string) => void): () => void
  listFolder(path: string, extensions: string[]): Promise<FolderListing>
  /**
   * An image referenced by a document, resolved against the document's folder.
   * Refuses sources outside that folder, non-images, and large files.
   */
  readDocumentImage(documentPath: string, src: string): Promise<ImageData>
}

/** The app's own window, driven by the custom title bar. */
export interface AppWindow {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  /** Requests a close; close-requested handlers still run. */
  close(): Promise<void>
  isMaximized(): Promise<boolean>
  /** Calls `listener` after the window changes size, maximize included. */
  onResized(listener: () => void): () => void
}

export interface NativeService extends FileService {
  /** True when running inside the Tauri shell, false in a plain browser. */
  readonly isDesktop: boolean
  appInfo(): Promise<AppInfo>
  /** Null in a plain browser, where the page has no window to control. */
  readonly window: AppWindow | null
}
