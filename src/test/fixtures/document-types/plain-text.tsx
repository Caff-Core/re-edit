import { useEffect, useImperativeHandle, useRef } from "react"

import {
  serializeText,
  textDocuments,
  type TextDocument,
} from "@/lib/text-document"
import {
  defineDocumentType,
  type DocumentCommandState,
  type DocumentEditorProps,
} from "@/workspace"

/**
 * Second document type, registered only in tests. It proves the workspace
 * contract (bytes in and out, tabs, dirty state, save, drafts, and routed
 * Undo and Redo) works for a type other than Markdown, with its own editor,
 * undo history, and dirty detection.
 */
function PlainTextEditor({
  title,
  initial,
  saved: savedDocument,
  onDirtyChange,
  onEdit,
  onCommandsChange,
  ref,
}: DocumentEditorProps<TextDocument>) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const saved = useRef(savedDocument.text)
  const format = useRef(initial.format)
  const dirty = useRef(initial.text !== savedDocument.text)
  const undoStack = useRef<string[]>([])
  const redoStack = useRef<string[]>([])
  const last = useRef(initial.text)

  const value = () => textarea.current?.value ?? last.current
  const reportCommands = () => {
    const commands: DocumentCommandState = {
      undo: undoStack.current.length > 0,
      redo: redoStack.current.length > 0,
    }
    onCommandsChange?.(commands)
  }
  const report = (content: string) => {
    const next = content !== saved.current
    if (next !== dirty.current) {
      dirty.current = next
      onDirtyChange(next)
    }
  }
  const setValue = (content: string) => {
    if (textarea.current) textarea.current.value = content
    last.current = content
    report(content)
    reportCommands()
  }

  // Report the commands once on mount; later changes report as they happen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reportCommands, [])

  useImperativeHandle(ref, () => ({
    serialize: async () => serializeText(value(), format.current),
    markSaved: (token) => {
      saved.current = token as string
      report(value())
    },
    replaceContent: (bytes) => {
      const next = textDocuments.load(bytes)
      undoStack.current.push(value())
      redoStack.current = []
      format.current = next.format
      saved.current = next.text
      setValue(next.text)
    },
    draft: value,
    run: (command) => {
      const [from, to] =
        command === "undo"
          ? [undoStack.current, redoStack.current]
          : command === "redo"
            ? [redoStack.current, undoStack.current]
            : [null, null]
      if (!from || !to) return false
      const previous = from.pop()
      if (previous === undefined) return true
      to.push(value())
      setValue(previous)
      onEdit()
      return true
    },
    focus: () => textarea.current?.focus(),
  }))

  return (
    <textarea
      ref={textarea}
      aria-label={`${title}, plain text`}
      defaultValue={initial.text}
      onChange={(event) => {
        undoStack.current.push(last.current)
        redoStack.current = []
        last.current = event.target.value
        report(event.target.value)
        reportCommands()
        onEdit()
      }}
    />
  )
}

export const plainTextDocumentType = defineDocumentType<TextDocument>({
  id: "plain-text",
  label: { en: "Plain text", "zh-CN": "纯文本" },
  defaultTitle: { en: "Untitled text", "zh-CN": "未命名文本" },
  extensions: [".txt"],
  ...textDocuments,
  Editor: PlainTextEditor,
})
