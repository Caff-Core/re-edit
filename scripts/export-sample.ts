/**
 * Writes a long standalone export (headings, tables, code, and math across
 * many pages) with the same builder File → Export uses. The Fedora packaging
 * job renders it to PDF to check pagination and embedded fonts.
 *
 *   bun scripts/export-sample.ts <out.html>
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { inlineKatexCss } from "../src/features/markdown/lib/render/katex-css"
import { markdownToStandaloneHtml } from "../src/features/markdown/lib/render/standalone"
import { markdownMessages } from "../src/features/markdown/messages"

const out = process.argv[2]
if (!out) throw new Error("usage: bun scripts/export-sample.ts <out.html>")

const section = (n: number) => `## Section ${n}

Paragraph ${n} has **bold**, _italic_, \`inline code\`, and inline math $e^{i\\pi} + 1 = 0$.

| Item | Value | Note |
| ---- | ----: | ---- |
| a${n} | ${n * 3} | kept together |
| b${n} | ${n * 7} | across pages |

\`\`\`ts
export function total(n: number): number {
  return (n * (n + 1)) / 2 // ${n}
}
\`\`\`

$$
\\sum_{k=1}^{${n}} k = \\frac{${n}(${n}+1)}{2}
$$
`

const source = `# Export sample

${Array.from({ length: 24 }, (_, i) => section(i + 1)).join("\n")}
## End of sample
`

const katexDir = "node_modules/katex/dist"
const fonts = Object.fromEntries(
  readdirSync(join(katexDir, "fonts"))
    .filter((name) => name.endsWith(".woff2"))
    .map((name) => [
      name,
      async () =>
        `data:font/woff2;base64,${readFileSync(join(katexDir, "fonts", name)).toString("base64")}`,
    ])
)

const html = await markdownToStandaloneHtml(source, {
  title: "Export sample",
  lang: "en",
  rootClass: "light",
  tokens: { background: "#ffffff", foreground: "#18181b", muted: "#f4f4f5" },
  css: readFileSync("src/features/markdown/lib/render/markdown.css", "utf8"),
  messages: markdownMessages.en,
  loadImage: () => Promise.reject(new Error("no images in the sample")),
  renderDiagram: () => Promise.reject(new Error("no diagrams in the sample")),
  loadMathCss: () =>
    inlineKatexCss(
      readFileSync(join(katexDir, "katex.min.css"), "utf8"),
      fonts
    ),
})
writeFileSync(out, html)
console.log(`${out}: ${html.length} bytes`)
