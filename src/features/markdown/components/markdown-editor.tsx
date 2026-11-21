import { redo, undo } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView, type Command } from "@codemirror/view"
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
} from "react"

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
  /** Replaces the whole document as one undoable change. */
  replace(content: string): void
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
  const refocus = useRef(false)
  const preferences = useEditorPreferences()

  useEffect(() => {
    callbacks.current = { onChange, onStatusChange, onAnnounce }
  }, [onChange, onStatusChange, onAnnounce])

  // Layout effect: the view must exist before parents read the handle (for
  // example to focus a newly opened document) in their own layout phase.
  useLayoutEffect(() => {
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
          onStatusChange: (status) =>
            callbacks.current.onStatusChange?.(status),
          onAnnounce: (message) => callbacks.current.onAnnounce?.(message),
        }),
      }),
    })
    viewRef.current = view
    // A remount (StrictMode in development, or a new label) replaces the view;
    // keep focus in the editor if the old view had it.
    if (refocus.current) {
      refocus.current = false
      view.focus()
    }
    return () => {
      refocus.current = view.hasFocus
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
      replace: (content: string) => {
        const view = viewRef.current
        if (!view || view.state.doc.toString() === content) return
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
          userEvent: "input.replace",
        })
      },
      getValue: () => viewRef.current?.state.doc.toString() ?? "",
    }
  }, [])

  return <div ref={hostRef} className="flex min-h-0 min-w-0 flex-1 flex-col" />
}
