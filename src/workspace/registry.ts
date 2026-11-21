import type { DocumentType } from "./types"

export interface DocumentRegistry {
  get(id: string): DocumentType | undefined
  /** The type that opens a path, matched by extension. */
  forPath(path: string): DocumentType | undefined
  list(): DocumentType[]
}

export function createDocumentRegistry(
  types: DocumentType[]
): DocumentRegistry {
  const byId = new Map<string, DocumentType>()
  const byExtension = new Map<string, DocumentType>()
  for (const type of types) {
    if (byId.has(type.id)) {
      throw new Error(`Document type "${type.id}" is registered twice`)
    }
    byId.set(type.id, type)
    for (const extension of type.extensions) {
      const key = extension.toLowerCase()
      const owner = byExtension.get(key)
      if (owner) {
        throw new Error(
          `Extension "${key}" is claimed by both "${owner.id}" and "${type.id}"`
        )
      }
      byExtension.set(key, type)
    }
  }
  return {
    get: (id) => byId.get(id),
    forPath: (path) => {
      const match = /(\.[^./\\]+)$/.exec(path.toLowerCase())
      return match ? byExtension.get(match[1]) : undefined
    },
    list: () => [...byId.values()],
  }
}
