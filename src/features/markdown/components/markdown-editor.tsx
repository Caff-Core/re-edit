import { redo, undo } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView, type Command } from "@codemirror/view"
import { useEffect, useImperativeHandle, useRef, type Ref } from "react"

import {
  markdownExtensions,
  reconfigurePreferences,
  type EditorStatus,
} from "../lib/extensions"
import { getEditorPreferences, useEditorPreferences } from "../lib/preferences"

export interface MarkdownEditorHandle {
  undo(): void
  redo(): void
  /** Runs a CodeMirror command against the editor and returns focus to it. */
  execute(command: Command): boolean
  focus(): void
  getValue(): string
}

export interface MarkdownEditorProps {
  initialValue: string
  /** Accessible name of the editing surface. */
  label: string
  onChange?: (value: string) => void
  onStatusChange?: (status: EditorStatus) => void
  onAnnounce?: (message: string) => void
  ref?: Ref<MarkdownEditorHandle>
}

/**
 * CodeMirror 6 surface for Markdown source. The document lives in the
 * CodeMirror state; `initialValue` seeds it once, and a new `key` resets it.
 * Editor preferences apply live without resetting history.
 */
export function MarkdownEditor({
  initialValue,
  label,
  onChange,
  onStatusChange,
  onAnnounce,
  ref,
}: MarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const callbacks = useRef({ onChange, onStatusChange, onAnnounce })
  const preferences = useEditorPreferences()

  useEffect(() => {
    callbacks.current = { onChange, onStatusChange, onAnnounce }
  }, [onChange, onStatusChange, onAnnounce])

  useEffect(() => {
    const parent = hostRef.current
    if (!parent) return
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialValue,
        extensions: markdownExtensions({
          label,
          preferences: getEditorPreferences(),
          onDocChange: (doc) => callbacks.current.onChange?.(doc),
          onStatusChange: (status) => callbacks.current.onStatusChange?.(status),
          onAnnounce: (message) => callbacks.current.onAnnounce?.(message),
        }),
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [initialValue, label])

  useEffect(() => {
    const view = viewRef.current
    if (view) reconfigurePreferences(view, preferences)
  }, [preferences])

  useImperativeHandle(ref, () => {
    const execute = (command: Command) => {
      const view = viewRef.current
      if (!view) return false
      const handled = command(view)
      view.focus()
      return handled
    }
    return {
      undo: () => execute(undo),
      redo: () => execute(redo),
      execute,
      focus: () => viewRef.current?.focus(),
      getValue: () => viewRef.current?.state.doc.toString() ?? "",
    }
  }, [])

  return <div ref={hostRef} className="flex min-h-0 min-w-0 flex-1 flex-col" />
}
