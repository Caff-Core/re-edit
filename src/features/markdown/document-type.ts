import { lazy } from "react"

import { decodeText } from "@/lib/text-codec"
import { textDocuments, type TextDocument } from "@/lib/text-document"
import { defineDocumentType } from "@/workspace"

export const markdownDocumentType = defineDocumentType<TextDocument>({
  id: "markdown",
  label: { en: "Markdown document", "zh-CN": "Markdown 文档" },
  defaultTitle: { en: "Untitled", "zh-CN": "未命名" },
  extensions: [".md", ".markdown"],
  ...textDocuments,
  // Loaded on first open so CodeMirror stays out of the startup bundle.
  Editor: lazy(() =>
    import("./components/markdown-document").then((module) => ({
      default: module.MarkdownDocument,
    }))
  ),
  // The render pipeline loads on first export, like the preview.
  exporter: {
    toStandaloneHtml: (bytes, context) =>
      import("./lib/render/exporter").then((module) =>
        module.exportMarkdown(decodeText(bytes).text, context)
      ),
  },
})
