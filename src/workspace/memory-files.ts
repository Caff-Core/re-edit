import {
  FileError,
  type FileService,
  type FileStat,
  type FolderEntry,
  type FolderListing,
  type DocumentFile,
  type ImageData,
} from "@/services/native"

function parentOf(path: string) {
  const index = path.lastIndexOf("/")
  return index <= 0 ? "/" : path.slice(0, index)
}

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
}

function nameOf(path: string) {
  return path.slice(path.lastIndexOf("/") + 1)
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** A text view over stored bytes (UTF-8), for tests and the sample folder. */
class TextView {
  private readonly bytes: Map<string, Uint8Array>
  constructor(bytes: Map<string, Uint8Array>) {
    this.bytes = bytes
  }
  get size() {
    return this.bytes.size
  }
  get(path: string) {
    const data = this.bytes.get(path)
    return data === undefined ? undefined : decoder.decode(data)
  }
  set(path: string, content: string) {
    this.bytes.set(path, encoder.encode(content))
    return this
  }
  has(path: string) {
    return this.bytes.has(path)
  }
  delete(path: string) {
    return this.bytes.delete(path)
  }
  keys() {
    return this.bytes.keys()
  }
}

/**
 * In-memory file system with scripted dialog answers. Used by tests and by the
 * browser build, which has no access to the disk.
 */
export class MemoryFileService implements FileService {
  /** File contents as stored, byte for byte. */
  readonly bytes = new Map<string, Uint8Array>()
  /** The same files read and written as UTF-8 text. */
  readonly files = new TextView(this.bytes)
  /** Every read, with the size limit the document type asked for. */
  readonly reads: { path: string; maxBytes: number | undefined }[] = []
  /** Answers for the next dialogs; undefined or null means "cancelled". */
  nextOpenFile: string | null = null
  nextFolder: string | null = null
  nextSavePath: string | null | ((suggestedName: string) => string | null) =
    null
  /** Number of upcoming writes that fail. */
  failWrites = 0
  /** Modification time per file; advances on every write. */
  readonly modified = new Map<string, number>()
  readonly watched = new Set<string>()
  private readonly listeners = new Set<(path: string) => void>()
  private clock = 1

  constructor(files: Record<string, string | Uint8Array> = {}) {
    for (const [path, content] of Object.entries(files))
      this.bytes.set(
        path,
        typeof content === "string" ? encoder.encode(content) : content
      )
  }

  async pickOpenFile() {
    return this.nextOpenFile
  }

  async pickFolder() {
    return this.nextFolder
  }

  /** Export destination; the extension is added like the host does. */
  nextExportPath: string | null = null
  /** Number of upcoming PDF renders that fail. */
  failExports = 0
  /** Rendered PDFs, keyed by path, holding the HTML they were made from. */
  readonly pdfs = new Map<string, string>()

  async pickExportPath(_suggestedName: string, format: "html" | "pdf") {
    const path = this.nextExportPath
    if (path === null) return null
    return /\.(html?|pdf)$/i.test(path) ? path : `${path}.${format}`
  }

  async exportPdf(path: string, html: string) {
    if (this.failExports > 0) {
      this.failExports--
      throw new FileError("rendererFailed", "the renderer exited with 1")
    }
    this.pdfs.set(path, html)
    return ++this.clock
  }

  async pickSavePath(suggestedName: string) {
    return typeof this.nextSavePath === "function"
      ? this.nextSavePath(suggestedName)
      : this.nextSavePath
  }

  async readFile(path: string, maxBytes?: number): Promise<DocumentFile> {
    this.reads.push({ path, maxBytes })
    const bytes = this.bytes.get(path)
    if (bytes === undefined) throw new Error(`${path} does not exist`)
    if (bytes.length > (maxBytes ?? 20 * 1024 * 1024))
      throw new FileError("tooLarge", `${path} is too large`)
    return { bytes: bytes.slice(), modifiedMs: this.modified.get(path) ?? 1 }
  }

  async statFile(path: string): Promise<FileStat> {
    return this.bytes.has(path)
      ? { exists: true, modifiedMs: this.modified.get(path) ?? 1 }
      : { exists: false, modifiedMs: 0 }
  }

  async watchPaths(paths: string[]) {
    this.watched.clear()
    for (const path of paths) this.watched.add(path)
  }

  onFileChanged(listener: (path: string) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Another program writes the file (or deletes it with null). */
  externalWrite(path: string, content: string | Uint8Array | null) {
    if (content === null) {
      this.bytes.delete(path)
      this.modified.delete(path)
    } else {
      this.bytes.set(
        path,
        typeof content === "string" ? encoder.encode(content) : content
      )
      this.modified.set(path, ++this.clock)
    }
    if (this.watched.has(path))
      this.listeners.forEach((listener) => listener(path))
  }

  async writeFile(
    path: string,
    content: Uint8Array,
    expectedModifiedMs: number | null = null
  ) {
    if (this.failWrites > 0) {
      this.failWrites--
      throw new FileError("io", `${path}: permission denied`)
    }
    if (
      expectedModifiedMs !== null &&
      (!this.bytes.has(path) ||
        (this.modified.get(path) ?? 1) !== expectedModifiedMs)
    ) {
      throw new FileError(
        "conflict",
        `${path} changed on disk since it was opened`
      )
    }
    this.bytes.set(path, content.slice())
    const modified = ++this.clock
    this.modified.set(path, modified)
    // Like inotify, the app's own writes are reported too.
    if (this.watched.has(path))
      this.listeners.forEach((listener) => listener(path))
    return modified
  }

  /** Same rules as the native command; image files hold base64 content. */
  async readDocumentImage(
    documentPath: string,
    src: string
  ): Promise<ImageData> {
    const outside = new Error(`${src} is outside the document's folder`)
    const clean = decodeURIComponent(src.split(/[?#]/)[0] ?? "")
    if (!clean || clean.includes(":") || clean.startsWith("/")) throw outside
    const parts = clean.split("/").filter((p) => p !== "" && p !== ".")
    if (parts.includes("..")) throw outside
    const path = `${parentOf(documentPath)}/${parts.join("/")}`
    const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase()
    const mime = IMAGE_TYPES[extension]
    if (!mime) throw new Error(`${src} is not a supported image type`)
    const base64 = this.files.get(path)
    if (base64 === undefined)
      throw new Error(`${src} was not found next to the document`)
    return { mime, base64 }
  }

  async listFolder(root: string, extensions: string[]): Promise<FolderListing> {
    const prefix = root.endsWith("/") ? root : `${root}/`
    const wanted = extensions.map((e) => e.toLowerCase())
    const folders = new Set<string>()
    const files: FolderEntry[] = []
    for (const path of this.files.keys()) {
      if (!path.startsWith(prefix)) continue
      if (!wanted.some((e) => path.toLowerCase().endsWith(e))) continue
      files.push({
        path,
        name: nameOf(path),
        parent: parentOf(path),
        kind: "file",
      })
      for (
        let dir = parentOf(path);
        dir.length > root.length;
        dir = parentOf(dir)
      ) {
        folders.add(dir)
      }
    }
    if (
      files.length === 0 &&
      ![...this.files.keys()].some((p) => p.startsWith(prefix))
    ) {
      throw new Error(`${root} does not exist`)
    }
    const entries: FolderEntry[] = [
      ...[...folders].map((path) => ({
        path,
        name: nameOf(path),
        parent: parentOf(path),
        kind: "folder" as const,
      })),
      ...files,
    ].sort((a, b) =>
      a.kind === b.kind
        ? a.name.localeCompare(b.name)
        : a.kind === "folder"
          ? -1
          : 1
    )
    return { root, entries, truncated: false }
  }
}
