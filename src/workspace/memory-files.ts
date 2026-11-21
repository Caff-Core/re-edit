import type {
  FileService,
  FolderEntry,
  FolderListing,
  ImageData,
  TextFile,
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

/**
 * In-memory file system with scripted dialog answers. Used by tests and by the
 * browser build, which has no access to the disk.
 */
export class MemoryFileService implements FileService {
  readonly files = new Map<string, string>()
  /** Answers for the next dialogs; undefined or null means "cancelled". */
  nextOpenFile: string | null = null
  nextFolder: string | null = null
  nextSavePath: string | null | ((suggestedName: string) => string | null) =
    null
  /** Number of upcoming writes that fail. */
  failWrites = 0
  private clock = 1

  constructor(files: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(files))
      this.files.set(path, content)
  }

  async pickOpenFile() {
    return this.nextOpenFile
  }

  async pickFolder() {
    return this.nextFolder
  }

  async pickSavePath(suggestedName: string) {
    return typeof this.nextSavePath === "function"
      ? this.nextSavePath(suggestedName)
      : this.nextSavePath
  }

  async readTextFile(path: string): Promise<TextFile> {
    const content = this.files.get(path)
    if (content === undefined) throw new Error(`${path} does not exist`)
    return { content, modifiedMs: this.clock }
  }

  async writeTextFile(path: string, content: string) {
    if (this.failWrites > 0) {
      this.failWrites--
      throw new Error(`${path}: permission denied`)
    }
    this.files.set(path, content)
    return ++this.clock
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
