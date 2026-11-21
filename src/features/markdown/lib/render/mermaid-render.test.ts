import { beforeEach, describe, expect, it, vi } from "vitest"

const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  parse: vi.fn(async (source: string) => {
    if (source.includes("-->\n") || source.trim().endsWith("-->")) {
      throw new Error("Parse error on line 2: expecting a node")
    }
    return true
  }),
  render: vi.fn(async (_id: string, source: string) => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg"><text>${source.length}</text></svg>`,
  })),
}))
vi.mock("mermaid", () => ({ default: mermaid }))

import { fixedWidth, mermaidTitle, renderMermaid } from "./mermaid-render"

describe("mermaid rendering", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders with strict security and SVG text labels into an SVG data URL", async () => {
    const url = await renderMermaid("graph TD\n  A --> B", false)
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true)
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: "strict",
        htmlLabels: false,
        theme: "default",
      })
    )
  })

  it("renders each source and theme once", async () => {
    await renderMermaid("graph LR\n  X --> Y", true)
    await renderMermaid("graph LR\n  X --> Y", true)
    expect(mermaid.render).toHaveBeenCalledTimes(1)
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "dark" })
    )
  })

  it("rejects invalid diagrams with the parser message", async () => {
    await expect(renderMermaid("graph TD\n  A -->", false)).rejects.toThrow(
      "Parse error on line 2"
    )
    expect(mermaid.render).not.toHaveBeenCalled()
  })

  it("reads the accessible title", () => {
    expect(mermaidTitle("graph TD\n  accTitle: Release flow\n  A-->B")).toBe(
      "Release flow"
    )
    expect(mermaidTitle("graph TD")).toBeNull()
  })
})

describe("fixedWidth", () => {
  it("replaces the root width with the natural width", () => {
    const svg =
      '<svg id="a" width="100%" style="max-width: 115.2px;" viewBox="0 0 115 150"><rect width="100%"/></svg>'
    expect(fixedWidth(svg)).toBe(
      '<svg id="a" width="115.2" style="max-width: 115.2px;" viewBox="0 0 115 150"><rect width="100%"/></svg>'
    )
    expect(fixedWidth("<svg></svg>")).toBe("<svg></svg>")
  })
})
