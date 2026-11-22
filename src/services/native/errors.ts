import { useCallback } from "react"

import { defineMessages, useMessages } from "@/lib/i18n"
import { UnsupportedDocumentError } from "@/lib/unsupported-document"

import { FileError } from "./types"

const messages = defineMessages({
  en: {
    outsideScope:
      "The editor may not use this location. Open the file or its folder first.",
    notFound: "The file was not found.",
    tooLarge: "The file is too large to open.",
    notText: "The file is not plain text.",
    conflict: "The file changed on disk after it was opened.",
    unavailable: "Files are available in the desktop app.",
    unsaved: "Save the document to show local images.",
    rendererMissing:
      "PDF export needs Chromium. Install it with: sudo dnf install chromium",
    rendererFailed: (detail: string) =>
      `The PDF could not be rendered (${detail}). The destination was not changed.`,
    io: (detail: string) =>
      `The file could not be read or written (${detail}).`,
    encoding: (detail: string) =>
      `The file uses a text encoding the editor cannot keep intact (${detail}). It was not opened, so nothing in it changed.`,
    encrypted: "The file is encrypted, so the editor cannot change it safely.",
    damaged: "The file is damaged or is not the format its name suggests.",
    unsupportedFeature: (detail: string) =>
      `The file uses something the editor cannot change safely (${detail}).`,
  },
  "zh-CN": {
    outsideScope: "编辑器无权访问此位置。请先打开该文件或其所在文件夹。",
    notFound: "找不到该文件。",
    tooLarge: "文件过大，无法打开。",
    notText: "该文件不是纯文本文件。",
    conflict: "文件在打开后已在磁盘上被修改。",
    unavailable: "文件功能仅在桌面应用中可用。",
    unsaved: "请先保存文档，才能显示本地图片。",
    rendererMissing:
      "导出 PDF 需要 Chromium。安装命令：sudo dnf install chromium",
    rendererFailed: (detail: string) =>
      `无法生成 PDF（${detail}）。目标文件未被更改。`,
    io: (detail: string) => `无法读取或写入文件（${detail}）。`,
    encoding: (detail: string) =>
      `该文件使用的文本编码无法被完整保留（${detail}）。文件未被打开，内容没有任何改动。`,
    encrypted: "该文件已加密，编辑器无法安全地修改它。",
    damaged: "该文件已损坏，或与其扩展名所示的格式不符。",
    unsupportedFeature: (detail: string) =>
      `该文件使用了编辑器无法安全修改的内容（${detail}）。`,
  },
})

export type FileErrorMessages = (typeof messages)["en"]

/** Readable text for an error from a file operation. */
export function describeError(m: FileErrorMessages, error: unknown): string {
  if (error instanceof UnsupportedDocumentError) {
    const detail = error.detail ?? ""
    switch (error.reason) {
      case "encoding":
        return m.encoding(detail)
      case "encrypted":
        return m.encrypted
      case "damaged":
        return m.damaged
      case "unsupported":
        return m.unsupportedFeature(detail)
    }
  }
  if (error instanceof FileError) {
    if (error.kind === "io") return m.io(error.message)
    if (error.kind === "rendererFailed") return m.rendererFailed(error.message)
    return m[error.kind]
  }
  return error instanceof Error ? error.message : String(error)
}

/** `describeError` bound to the current language. */
export function useDescribeError() {
  const m = useMessages(messages)
  return useCallback((error: unknown) => describeError(m, error), [m])
}
