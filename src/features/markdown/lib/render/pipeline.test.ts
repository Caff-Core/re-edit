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
