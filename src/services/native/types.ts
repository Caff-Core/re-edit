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
  /** Returns the new modification time. */
  writeTextFile(path: string, content: string): Promise<number>
  listFolder(path: string, extensions: string[]): Promise<FolderListing>
  /**
   * An image referenced by a document, resolved against the document's folder.
   * Refuses sources outside that folder, non-images, and large files.
   */
  readDocumentImage(documentPath: string, src: string): Promise<ImageData>
}

export interface NativeService extends FileService {
  /** True when running inside the Tauri shell, false in a plain browser. */
  readonly isDesktop: boolean
  appInfo(): Promise<AppInfo>
}
