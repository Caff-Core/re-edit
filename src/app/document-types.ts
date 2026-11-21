import { markdownDocumentType } from "@/features/markdown"
import { nativeService, type FileService } from "@/services/native"
import {
  createDocumentRegistry,
  localSessionStore,
  MemoryFileService,
} from "@/workspace"

/** Document types the app can open. Add a feature's type here to register it. */
export const documentRegistry = createDocumentRegistry([markdownDocumentType])

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
    "/samples/notes/todo.md":
      "# To do\n\n- [ ] Open a real folder in the desktop app\n",
  })
  files.nextFolder = "/samples"
  files.nextOpenFile = "/samples/welcome.md"
  files.nextSavePath = (name) => `/samples/${name}`
  return files
}

export const fileService: FileService = nativeService.isDesktop
  ? nativeService
  : browserSampleFiles()

export const sessionStore = localSessionStore
