import { describe, expect, it } from "vitest"

import { markdownFixture } from "@/test/fixtures"

import { markdownToHtml } from "./pipeline"

describe("markdown render pipeline", () => {
  const html = markdownToHtml(markdownFixture("basic"))

  it("renders headings, emphasis, and lists", () => {
    expect(html).toContain("<h1>Heading one</h1>")
    expect(html).toContain("<strong>bold</strong>")
    expect(html).toContain("<em>italic</em>")
    expect(html).toContain("<ol>")
  })

  it("renders GFM tables with alignment", () => {
    expect(html).toContain("<table>")
    expect(html).toMatch(/<th align="right">Value<\/th>/)
  })

  it("renders task lists as disabled checkboxes", () => {
    expect(html).toMatch(/<input type="checkbox" disabled>/)
    expect(html).toMatch(/<input type="checkbox" checked disabled>/)
  })

  it("renders footnotes whose links match their targets", () => {
    expect(html).toContain('href="#user-content-fn-1"')
    expect(html).toContain('<li id="user-content-fn-1">')
    expect(html).toContain('id="user-content-fnref-1"')
    expect(html).toContain('href="#user-content-fnref-1"')
  })

  it("highlights fenced code by language", () => {
    expect(html).toMatch(/<code class="hljs language-ts">/)
    expect(html).toContain('<span class="hljs-keyword">export</span>')
  })

  it("drops raw HTML so it cannot run", () => {
    const out = markdownToHtml(
      'Hi <script>alert(1)</script> <img src=x onerror="alert(1)"> <b onclick="x()">b</b>\n\n<iframe src="https://example.com"></iframe>'
    )
    // Tags and handlers are gone; leftover text such as "alert(1)" is inert.
    expect(out).not.toMatch(/<script|<img|<iframe|<b\b|onerror|onclick/)
  })

  it("removes links and images with unsafe protocols", () => {
    const out = markdownToHtml(
      "[bad](javascript:alert(1)) [data](data:text/html,x) ![img](javascript:alert(1)) [ok](https://example.com) [mail](mailto:a@b.c) [anchor](#top)"
    )
    expect(out).not.toContain("javascript:")
    expect(out).not.toContain("data:text/html")
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('href="mailto:a@b.c"')
    expect(out).toContain('href="#top"')
  })

  it("keeps web images", () => {
    expect(markdownToHtml("![alt](https://example.com/a.png)")).toContain(
      '<img src="https://example.com/a.png" alt="alt">'
    )
  })
})

describe("extended GFM fixture", () => {
  const html = markdownToHtml(markdownFixture("gfm-extended"))

  it("renders strikethrough, autolinks, and hard breaks", () => {
    expect(html).toContain("<del>Struck through</del>")
    expect(html).toContain(
      '<a href="https://example.com">https://example.com</a>'
    )
    expect(html).toContain(
      '<a href="https://example.org">https://example.org</a>'
    )
    expect(html).toMatch(/Line one<br>\s*Line two/)
  })

  it("renders nested lists and escaped pipes in table cells", () => {
    expect(html).toMatch(/<ol>[\s\S]*<ul>[\s\S]*<ol>/)
    expect(html).toContain("<code>a | b</code>")
    expect(html).toMatch(
      /<td align="center">x \| y<\/td>|<td align="center">x | y<\/td>/
    )
  })

  it("drops HTML blocks", () => {
    expect(html).not.toMatch(/<div|<details|onclick|steal\(\)/)
  })
})

describe("images fixture", () => {
  const html = markdownToHtml(markdownFixture("images"))

  it("keeps relative and remote sources for the preview to resolve", () => {
    expect(html).toContain('src="img/dot.png"')
    expect(html).toContain('src="../secret.png"')
    expect(html).toContain('src="https://example.com/photo.png"')
  })

  it("removes unsafe image sources", () => {
    expect(html).not.toContain("javascript:")
  })
})

describe("math and diagrams fixture", () => {
  const html = markdownToHtml(markdownFixture("math-diagrams"))

  it("renders inline and display math with MathML for screen readers", () => {
    expect(html).toContain('<span class="katex">')
    expect(html).toContain('<span class="katex-display">')
    expect(html).toContain("<math")
    expect(html).toContain(
      '<annotation encoding="application/x-tex">E = mc^2</annotation>'
    )
  })

  it("shows broken math inline with the parse error", () => {
    expect(html).toMatch(
      /<span class="katex-error" title="ParseError: KaTeX parse error[^"]*"/
    )
  })

  it("turns mermaid blocks into diagram placeholders with their source", () => {
    expect(html).toContain(
      '<figure class="md-mermaid" data-source="graph TD\n  accTitle: Release flow'
    )
    expect(html).not.toContain("language-mermaid")
  })

  it("keeps math input inert", () => {
    expect(markdownToHtml("$<script>alert(1)</script>$")).not.toContain(
      "<script"
    )
  })
})
