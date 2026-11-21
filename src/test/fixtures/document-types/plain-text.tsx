import { useImperativeHandle, useRef } from "react"

import type { DocumentEditorProps, DocumentType } from "@/workspace"

/**
 * Second document type, registered only in tests. It proves the workspace
 * contract (tabs, dirty state, save) works for a type other than Markdown,
 * with its own editor and its own dirty detection.
 */
function PlainTextEditor({
  title,
  initialContent,
  savedContent,
  onDirtyChange,
  onEdit,
  ref,
}: DocumentEditorProps) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const saved = useRef(savedContent)
  const dirty = useRef(initialContent !== savedContent)

  const report = (content: string) => {
    const next = content !== saved.current
    if (next !== dirty.current) {
      dirty.current = next
      onDirtyChange(next)
    }
  }

  useImperativeHandle(ref, () => ({
    serialize: () => textarea.current?.value ?? saved.current,
    markSaved: (content) => {
      saved.current = content
      report(textarea.current?.value ?? content)
    },
    focus: () => textarea.current?.focus(),
    replaceContent: (content, savedContent) => {
      saved.current = savedContent
      if (textarea.current) textarea.current.value = content
      report(content)
    },
  }))

  return (
    <textarea
      ref={textarea}
      aria-label={`${title}, plain text`}
      defaultValue={initialContent}
      onChange={(event) => {
        report(event.target.value)
        onEdit()
      }}
    />
  )
}

export const plainTextDocumentType: DocumentType = {
  id: "plain-text",
  label: { en: "Plain text", "zh-CN": "纯文本" },
  defaultTitle: { en: "Untitled text", "zh-CN": "未命名文本" },
  extensions: [".txt"],
  createEmpty: () => "",
  Editor: PlainTextEditor,
}
