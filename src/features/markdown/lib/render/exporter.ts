import type { DocumentExportContext } from "@/workspace"

import { markdownMessages } from "../../messages"
import katexCss from "katex/dist/katex.min.css?raw"

import documentCss from "./markdown.css?raw"
import { renderMermaid } from "./mermaid-render"
import { markdownToStandaloneHtml } from "./standalone"

const THEME_CLASS = /^(light|dark|theme-[a-z-]+)$/

/** Current values of every token the document stylesheet uses. */
function themeTokens(css: string): Record<string, string> {
  const names = new Set(["background", "foreground"])
  for (const [, name] of css.matchAll(/var\(--([a-z0-9-]+)\)/g)) names.add(name)
  const style = getComputedStyle(document.documentElement)
  const tokens: Record<string, string> = {}
  for (const name of names) {
    const value = style.getPropertyValue(`--${name}`).trim()
    if (value) tokens[name] = value
  }
  return tokens
}

/** KaTeX fonts as data URLs, loaded only when an export has math. */
const katexFonts = import.meta.glob<string>(
  "/node_modules/katex/dist/fonts/*.woff2",
  { query: "?inline", import: "default" }
)

/**
 * KaTeX's stylesheet with each font inlined as woff2. Every engine the
 * export targets reads woff2, so the woff and ttf fallbacks are dropped.
 */
export async function inlineKatexCss(
  css: string,
  fonts: Record<string, () => Promise<string>>
): Promise<string> {
  const urls = new Map<string, string>()
  await Promise.all(
    Object.entries(fonts).map(async ([path, load]) => {
      const name = /([\w-]+)\.woff2$/.exec(path)?.[1]
      if (name) urls.set(name, await load())
    })
  )
  return css.replace(
    /src:url\(fonts\/([\w-]+)\.woff2\) format\("woff2"\)[^;}]*/g,
    (rule, name: string) => {
      const url = urls.get(name)
      return url ? `src:url(${url}) format("woff2")` : rule
    }
  )
}

/** Standalone HTML for a Markdown buffer, in the active theme. */
export function exportMarkdown(
  content: string,
  context: DocumentExportContext
): Promise<string> {
  const root = document.documentElement
  const dark = root.classList.contains("dark")
  return markdownToStandaloneHtml(content, {
    title: context.title,
    lang: context.locale,
    rootClass: [...root.classList].filter((c) => THEME_CLASS.test(c)).join(" "),
    tokens: themeTokens(documentCss),
    css: documentCss,
    messages: markdownMessages[context.locale],
    loadImage: context.resolveAsset,
    renderDiagram: (source) => renderMermaid(source, dark),
    loadMathCss: () => inlineKatexCss(katexCss, katexFonts),
  })
}
