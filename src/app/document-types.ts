import { markdownDocumentType } from "@/features/markdown"
import { MemoryDocumentStore, createDocumentRegistry } from "@/workspace"

/** Document types the app can open. Add a feature's type here to register it. */
export const documentRegistry = createDocumentRegistry([markdownDocumentType])

/** In-memory until file management (003) supplies the native store. */
export const documentStore = new MemoryDocumentStore()
