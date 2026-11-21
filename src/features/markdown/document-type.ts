import { lazy } from "react"

import type { DocumentType } from "@/workspace"

export const markdownDocumentType: DocumentType = {
  id: "markdown",
  label: "Markdown document",
  defaultTitle: "Untitled",
  extensions: [".md", ".markdown"],
  createEmpty: () => "",
  // Loaded on first open so CodeMirror stays out of the startup bundle.
  Editor: lazy(() =>
    import("./components/markdown-document").then((module) => ({
      default: module.MarkdownDocument,
    }))
  ),
}
