import type { Element, ElementContent, Root } from "hast"
import { toHtml } from "hast-util-to-html"
import { visit } from "unist-util-visit"

import type { MarkdownMessages } from "../../messages"
import { MERMAID_CLASS } from "./mermaid-blocks"
import { mermaidTitle } from "./mermaid-render"
import { markdownToHast } from "./pipeline"

export interface StandaloneOptions {
  title: string
  lang: string
  /** Classes for <html>: the scheme and palette, so themed rules apply. */
  rootClass: string
  /** Theme token values, written as custom properties on :root. */
  tokens: Record<string, string>
  /** The document stylesheet (markdown.css). */
  css: string
  messages: MarkdownMessages
  /** Local image source to a data URL; rejects when it cannot be shown. */
  loadImage: (src: string) => Promise<string>
  /** Mermaid source to an SVG data URL. */
  renderDiagram: (source: string) => Promise<string>
}

const REMOTE = /^https?:\/\//i

const hasClass = (node: Element, name: string) =>
  Array.isArray(node.properties?.className) &&
  node.properties.className.includes(name)

const text = (value: string): ElementContent => ({ type: "text", value })

function note(message: string, alt?: string): Element {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["md-image-note"] },
    children: alt
      ? [
          {
            type: "element",
            tagName: "strong",
            properties: {},
            children: [text(alt)],
          },
          text(` ${message}`),
        ]
      : [text(message)],
  }
}

function diagramSource(
  source: string,
  open: boolean,
  summary: string
): Element {
  return {
    type: "element",
    tagName: "details",
    properties: { open },
    children: [
      {
        type: "element",
        tagName: "summary",
        properties: {},
        children: [text(summary)],
      },
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: {},
            children: [text(source)],
          },
        ],
      },
    ],
  }
}

/**
 * Makes the preview tree self-contained: math keeps only its MathML (shown
 * natively, no fonts needed), diagrams and local images become data URLs,
 * and remote images become notes, as in the preview.
 */
async function embed(tree: Root, options: StandaloneOptions) {
  const t = options.messages
  const jobs: Promise<void>[] = []
  const katexHtml: { parent: { children: ElementContent[] }; node: Element }[] =
    []

  visit(tree, "element", (node, _index, parent) => {
    if (!parent) return
    if (hasClass(node, "katex-html")) {
      katexHtml.push({
        parent: parent as { children: ElementContent[] },
        node,
      })
      return
    }
    if (node.tagName === "figure" && hasClass(node, MERMAID_CLASS)) {
      const source = String(node.properties?.dataSource ?? "")
      const title = mermaidTitle(source)
      node.properties = { className: [MERMAID_CLASS] }
      jobs.push(
        options.renderDiagram(source).then(
          (url) => {
            node.children = [
              {
                type: "element",
                tagName: "img",
                properties: {
                  src: url,
                  alt: title ? t.diagramTitled(title) : t.diagramUntitled,
                },
                children: [],
              },
              diagramSource(source, false, t.diagramSource),
            ]
          },
          (error: unknown) => {
            const reason =
              error instanceof Error ? error.message : String(error)
            node.children = [
              note(`${t.diagramFailed} ${reason}`),
              diagramSource(source, true, t.diagramSource),
            ]
          }
        )
      )
      return
    }
    if (node.tagName === "img") {
      const src = String(node.properties?.src ?? "")
      const alt = node.properties?.alt ? String(node.properties.alt) : undefined
      const replace = (replacement: Element) => Object.assign(node, replacement)
      if (!src) return
      if (REMOTE.test(src)) {
        replace(note(t.remoteImage(new URL(src).host), alt))
        return
      }
      jobs.push(
        options.loadImage(src).then(
          (url) => {
            node.properties = { ...node.properties, src: url }
          },
          () => {
            replace(note(t.imageNotIncluded(src), alt))
          }
        )
      )
    }
  })

  for (const { parent, node } of katexHtml)
    parent.children = parent.children.filter((child) => child !== node)
  await Promise.all(jobs)
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/** A CSS color value, without anything that could end the rule. */
const SAFE_COLOR = /^[#\w\s(),.%/-]+$/

/**
 * Page rules for the standalone file and its printed (PDF) form. Print page
 * margins sit outside the root element, so `@page` paints the theme
 * background there itself; `var()` does not resolve inside `@page`.
 */
const pageCss = (background: string | undefined) => `
html, body { margin: 0; background: var(--background); color: var(--foreground); }
.markdown-body { max-width: 80ch; margin: 0 auto; padding: 2rem 1.5rem; }
@page { margin: 18mm 16mm;${
  background && SAFE_COLOR.test(background) ? ` background: ${background};` : ""
} }
@media print {
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .markdown-body { max-width: none; padding: 0; }
  :is(pre, table, figure, blockquote, img, .katex-display) { break-inside: avoid; }
  :is(h1, h2, h3, h4, h5, h6) { break-after: avoid; }
}
`

/**
 * Markdown to one HTML file that embeds its styles, theme, images, and
 * diagrams. A content security policy keeps it from loading anything or
 * running script, so it opens the same offline.
 */
export async function markdownToStandaloneHtml(
  source: string,
  options: StandaloneOptions
): Promise<string> {
  const tree = markdownToHast(source)
  await embed(tree, options)
  const tokens = Object.entries(options.tokens)
    .map(([name, value]) => `--${name}: ${value};`)
    .join(" ")
  const scheme = /\bdark\b/.test(options.rootClass) ? "dark" : "light"
  return `<!doctype html>
<html lang="${escapeHtml(options.lang)}" class="${escapeHtml(options.rootClass)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<meta name="color-scheme" content="${scheme}">
<title>${escapeHtml(options.title)}</title>
<style>
:root { ${tokens} }
${pageCss(options.tokens.background)}
${options.css}
</style>
</head>
<body>
<article class="markdown-body">
${toHtml(tree)}
</article>
</body>
</html>
`
}
