import type { DocumentRef, DocumentStore } from "./types"

/** Keeps saved content in memory. Used until the native store lands in 003. */
export class MemoryDocumentStore implements DocumentStore {
  readonly saved = new Map<string, { document: DocumentRef; content: string }>()

  async write(document: DocumentRef, content: string) {
    this.saved.set(document.id, { document, content })
  }
}
