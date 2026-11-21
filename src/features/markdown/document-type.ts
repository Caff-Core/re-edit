import { lazy } from "react"

import type { DocumentType } from "@/workspace"

export const markdownDocumentType: DocumentType = {
  id: "markdown",
  label: { en: "Markdown document", "zh-CN": "Markdown 文档" },
  defaultTitle: { en: "Untitled", "zh-CN": "未命名" },
  extensions: [".md", ".markdown"],
  createEmpty: () => "",
  // Loaded on first open so CodeMirror stays out of the startup bundle.
  Editor: lazy(() =>
    import("./components/markdown-document").then((module) => ({
      default: module.MarkdownDocument,
    }))
  ),
  // The render pipeline loads on first export, like the preview.
  exporter: {
    toStandaloneHtml: (content, context) =>
      import("./lib/render/exporter").then((module) =>
        module.exportMarkdown(content, context)
      ),
  },
}
