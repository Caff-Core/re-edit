import { describe, expect, it } from "vitest"

import { inlineKatexCss } from "./exporter"

describe("KaTeX stylesheet for exports", () => {
  it("inlines each woff2 font and drops the woff and ttf fallbacks", async () => {
    const css =
      '@font-face{font-family:KaTeX_AMS;src:url(fonts/KaTeX_AMS-Regular.woff2) format("woff2"),url(fonts/KaTeX_AMS-Regular.woff) format("woff"),url(fonts/KaTeX_AMS-Regular.ttf) format("truetype")}' +
      '@font-face{font-family:KaTeX_X;src:url(fonts/KaTeX_X.woff2) format("woff2"),url(fonts/KaTeX_X.woff) format("woff")}'
    const out = await inlineKatexCss(css, {
      "/node_modules/katex/dist/fonts/KaTeX_AMS-Regular.woff2": async () =>
        "data:font/woff2;base64,AAAA",
    })
    expect(out).toContain(
      '@font-face{font-family:KaTeX_AMS;src:url(data:font/woff2;base64,AAAA) format("woff2")}'
    )
    expect(out).not.toContain("KaTeX_AMS-Regular.woff)")
    // A font without data keeps its original rule.
    expect(out).toContain('src:url(fonts/KaTeX_X.woff2) format("woff2")')
  })
})
