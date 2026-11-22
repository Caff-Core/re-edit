import { lazy } from "react"

import { textDocuments, type TextDocument } from "@/lib/text-document"
import { defineDocumentType } from "@/workspace"

export const plainTextDocumentType = defineDocumentType<TextDocument>({
  id: "plain-text",
  label: { en: "Plain text", "zh-CN": "纯文本" },
  defaultTitle: { en: "Untitled text", "zh-CN": "未命名文本" },
  extensions: [".txt"],
  // The shared codec keeps the encoding, byte order mark, and line endings,
  // and refuses encodings it cannot keep intact.
  ...textDocuments,
  Editor: lazy(() =>
    import("./components/text-editor").then((module) => ({
      default: module.TextEditor,
    }))
  ),
})
