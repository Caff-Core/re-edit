import type { DocumentExportContext } from "@/workspace"

import { markdownMessages } from "../../messages"
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
  })
}
