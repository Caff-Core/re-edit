import { redo, undo } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { useEffect, useImperativeHandle, useRef, type Ref } from "react"

import { markdownExtensions, type HistoryState } from "../lib/extensions"

export interface MarkdownEditorHandle {
  undo(): void
  redo(): void
  focus(): void
  getValue(): string
}

export interface MarkdownEditorProps {
  initialValue: string
  /** Accessible name of the editing surface. */
  label: string
  onChange?: (value: string) => void
  onHistoryChange?: (history: HistoryState) => void
  ref?: Ref<MarkdownEditorHandle>
}

/**
 * CodeMirror 6 surface for Markdown source. The document lives in the
 * CodeMirror state; `initialValue` seeds it once, and a new `key` resets it.
 */
export function MarkdownEditor({
  initialValue,
  label,
  onChange,
  onHistoryChange,
  ref,
}: MarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const callbacks = useRef({ onChange, onHistoryChange })

  useEffect(() => {
    callbacks.current = { onChange, onHistoryChange }
  }, [onChange, onHistoryChange])

  useEffect(() => {
    const parent = hostRef.current
    if (!parent) return
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialValue,
        extensions: markdownExtensions({
          label,
          onDocChange: (doc) => callbacks.current.onChange?.(doc),
          onHistoryChange: (history) => callbacks.current.onHistoryChange?.(history),
        }),
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [initialValue, label])

  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        const view = viewRef.current
        if (!view) return
        undo(view)
        view.focus()
      },
      redo: () => {
        const view = viewRef.current
        if (!view) return
        redo(view)
        view.focus()
      },
      focus: () => viewRef.current?.focus(),
      getValue: () => viewRef.current?.state.doc.toString() ?? "",
    }),
    []
  )

  return <div ref={hostRef} className="flex min-h-0 min-w-0 flex-1 flex-col" />
}
