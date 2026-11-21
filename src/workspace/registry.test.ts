import { describe, expect, it } from "vitest"

import { createDocumentRegistry } from "./registry"
import type { DocumentType } from "./types"

const type = (id: string, extensions: string[]): DocumentType => ({
  id,
  label: { en: id, "zh-CN": id },
  defaultTitle: { en: id, "zh-CN": id },
  extensions,
  createEmpty: () => "",
  Editor: () => null,
})

describe("document registry", () => {
  it("looks types up by id and by file extension", () => {
    const registry = createDocumentRegistry([
      type("markdown", [".md", ".markdown"]),
      type("text", [".txt"]),
    ])
    expect(registry.get("text")?.id).toBe("text")
    expect(registry.forPath("/notes/README.MD")?.id).toBe("markdown")
    expect(registry.forPath("draft.txt")?.id).toBe("text")
    expect(registry.forPath("image.png")).toBeUndefined()
    expect(registry.forPath("no-extension")).toBeUndefined()
    expect(registry.list().map((t) => t.id)).toEqual(["markdown", "text"])
  })

  it("rejects duplicate ids and contested extensions", () => {
    expect(() =>
      createDocumentRegistry([type("a", []), type("a", [])])
    ).toThrow('Document type "a" is registered twice')
    expect(() =>
      createDocumentRegistry([type("a", [".md"]), type("b", [".MD"])])
    ).toThrow('Extension ".md" is claimed by both "a" and "b"')
  })
})
