import { markdownDocumentType } from "@/features/markdown"
import { pdfDocumentType } from "@/features/pdf"
import { plainTextDocumentType } from "@/features/plain-text"
import { nativeService, type FileService } from "@/services/native"

import samplePdfUrl from "./samples/form-sample.pdf?url"
import {
  createDocumentRegistry,
  localSessionStore,
  MemoryFileService,
} from "@/workspace"

/** Document types the app can open. Add a feature's type here to register it. */
export const documentRegistry = createDocumentRegistry([
  markdownDocumentType,
  plainTextDocumentType,
  pdfDocumentType,
])

/**
 * The browser build has no disk access, so `bun run dev` in a browser works
 * on a small in-memory sample folder. The desktop app uses native files.
 */
function browserSampleFiles(): FileService {
  const files = new MemoryFileService({
    "/samples/welcome.md":
      "# Welcome\n\nThis sample folder exists only in the browser build.\n",
    "/samples/notes/ideas.md":
      "# Ideas\n\n- Try the split view\n- Insert a table with Ctrl+Alt+T\n",
    "/samples/notes/plain.txt":
      "Plain text keeps its line endings.\r\nGrüße, 你好, café.\r\n",
    "/samples/notes/todo.md":
      "# To do\n\n- [ ] Open a real folder in the desktop app\n",
  })
  // A fillable sample PDF, so the PDF editor can be tried without a disk.
  void fetch(samplePdfUrl)
    .then((response) => response.arrayBuffer())
    .then((buffer) =>
      files.bytes.set("/samples/form.pdf", new Uint8Array(buffer))
    )
    .catch(() => {})
  files.nextFolder = "/samples"
  files.nextOpenFile = "/samples/welcome.md"
  files.nextSavePath = (name) => `/samples/${name}`
  return files
}

export const fileService: FileService = nativeService.isDesktop
  ? nativeService
  : browserSampleFiles()

export const sessionStore = localSessionStore
