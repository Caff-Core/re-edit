import { describe, expect, it } from "vitest"

import { markdownMessages } from "../../messages"
import { markdownToStandaloneHtml, type StandaloneOptions } from "./standalone"

const DOT = "data:image/png;base64,iVBORw=="
const SVG = "data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E"

function options(
  overrides: Partial<StandaloneOptions> = {}
): StandaloneOptions {
  return {
    title: "Notes <draft>",
    lang: "en",
    rootClass: "dark theme-solarized-dark",
    tokens: { background: "#002b36", foreground: "#c2d1d1" },
    css: ".markdown-body { color: var(--foreground); }",
    messages: markdownMessages.en,
    loadImage: async (src) => {
      if (src === "img/dot.png") return DOT
      throw new Error("missing")
    },
    renderDiagram: async (source) => {
      if (source.includes("-->") && source.trim().endsWith("-->"))
        throw new Error("Parse error on line 2")
      return SVG
    },
    ...overrides,
  }
}

const SOURCE = `# Title

![dot](img/dot.png) ![gone](img/gone.png) ![web](https://example.com/a.png)

$$
E = mc^2
$$

\`\`\`mermaid
accTitle: Flow
graph TD; A-->B
\`\`\`

\`\`\`mermaid
graph TD; A-->
\`\`\`

\`\`\`js
const a = 1
\`\`\`
`

describe("standalone HTML export", () => {
  it("embeds styles, theme tokens, and a policy that loads nothing", async () => {
    const html = await markdownToStandaloneHtml(SOURCE, options())
    expect(html).toMatch(
      /^<!doctype html>\n<html lang="en" class="dark theme-solarized-dark">/
    )
    expect(html).toContain("<title>Notes &lt;draft&gt;</title>")
    expect(html).toContain(
      `content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'"`
    )
    expect(html).toContain("--background: #002b36;")
    expect(html).toContain(".markdown-body { color: var(--foreground); }")
    expect(html).toContain('<meta name="color-scheme" content="dark">')
    expect(html).toContain("@page { margin: 18mm 16mm; background: #002b36; }")
    expect(html).not.toMatch(/<script|<link|src="https?:/)
  })

  it("never writes an unsafe background into the page rule", async () => {
    const html = await markdownToStandaloneHtml(
      "x",
      options({ tokens: { background: "red; } body { display: none" } })
    )
    expect(html).toContain("@page { margin: 18mm 16mm; }")
  })

  it("embeds KaTeX's styles and keeps its rendering when the document has math", async () => {
    let loads = 0
    const loadMathCss = async () => {
      loads++
      return ".katex { font: normal 1.21em KaTeX_Main; }"
    }
    const html = await markdownToStandaloneHtml(
      SOURCE,
      options({ loadMathCss })
    )
    expect(loads).toBe(1)
    expect(html).toContain(".katex { font: normal 1.21em KaTeX_Main; }")
    expect(html).toContain("katex-html")
    expect(html).toContain("<math")

    await markdownToStandaloneHtml("No math here.", options({ loadMathCss }))
    expect(loads).toBe(1)
  })

  it("falls back to MathML when KaTeX's styles cannot load", async () => {
    const html = await markdownToStandaloneHtml(
      SOURCE,
      options({ loadMathCss: () => Promise.reject(new Error("offline")) })
    )
    expect(html).toContain("<math")
    expect(html).not.toContain("katex-html")
  })

  it("keeps math as MathML without the font-dependent HTML copy", async () => {
    const html = await markdownToStandaloneHtml(SOURCE, options())
    expect(html).toContain("<math")
    expect(html).not.toContain("katex-html")
  })

  it("inlines local images and diagrams and explains what it left out", async () => {
    const html = await markdownToStandaloneHtml(SOURCE, options())
    expect(html).toContain(`<img src="${DOT}" alt="dot">`)
    expect(html).toContain("img/gone.png could not be included.")
    expect(html).toContain("Remote image from example.com is not loaded.")
    expect(html).toContain(`<img src="${SVG}" alt="Diagram: Flow">`)
    expect(html).toContain("Diagram could not be drawn. Parse error on line 2")
    expect(html).toContain("<summary>Diagram source</summary>")
    expect(html).toContain('class="hljs-keyword"')
  })

  it("writes notes in the interface language", async () => {
    const html = await markdownToStandaloneHtml(
      SOURCE,
      options({ lang: "zh-CN", messages: markdownMessages["zh-CN"] })
    )
    expect(html).toContain('<html lang="zh-CN"')
    expect(html).toContain("未加载来自 example.com 的远程图片。")
    expect(html).toContain("<summary>图表源代码</summary>")
  })
})
