import {
  defaultKeymap,
  history,
  historyKeymap,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from "@codemirror/commands"
import { openSearchPanel, search, searchKeymap } from "@codemirror/search"
import { Compartment, EditorState } from "@codemirror/state"
import {
  drawSelection,
  EditorView,
  keymap,
  placeholder,
} from "@codemirror/view"
import { useEffect, useImperativeHandle, useRef, useState } from "react"

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { codemirrorPhrases } from "@/lib/codemirror/phrases"
import {
  getEditorPreferences,
  useEditorPreferences,
} from "@/lib/codemirror/preferences"
import {
  preferenceExtensions,
  reconfigurePreferences,
} from "@/lib/codemirror/setup"
import { editorChrome } from "@/lib/codemirror/theme"
import { useLocale, useMessages } from "@/lib/i18n"
import {
  serializeText,
  textDocuments,
  type TextDocument,
} from "@/lib/text-document"
import type { DocumentEditorProps } from "@/workspace"

import { countText } from "../lib/counts"
import { plainTextMessages } from "../messages"

/** Pause after typing before the counts update. */
const COUNT_DELAY_MS = 300

/**
 * A plain-text tab on the shared CodeMirror foundation: undo and redo, find
 * and replace, the editor preferences, and live word and character counts.
 * Saving writes the text back in the file's own encoding, byte order mark,
 * and line endings.
 */
export function TextEditor({
  title,
  initial,
  saved: savedDocument,
  onDirtyChange,
  onEdit,
  onCommandsChange,
  ref,
}: DocumentEditorProps<TextDocument>) {
  const t = useMessages(plainTextMessages)
  const { locale } = useLocale()
  const preferences = useEditorPreferences()
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const saved = useRef(savedDocument.text)
  const [format, setFormat] = useState(initial.format)
  const formatRef = useRef(format)
  const dirty = useRef(initial.text !== savedDocument.text)
  const [counts, setCounts] = useState(() => countText(initial.text, locale))
  const [showMixed, setShowMixed] = useState(initial.format.mixedLineEndings)
  const strings = useRef(new Compartment())
  const callbacks = useRef({ onDirtyChange, onEdit, onCommandsChange, locale })

  useEffect(() => {
    callbacks.current = { onDirtyChange, onEdit, onCommandsChange, locale }
    formatRef.current = format
  })

  const report = (text: string) => {
    const next = text !== saved.current
    if (next !== dirty.current) {
      dirty.current = next
      callbacks.current.onDirtyChange(next)
    }
  }

  // Create the editor once; preferences, language, and title apply live.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial.text,
        extensions: [
          history(),
          drawSelection(),
          search({ top: true }),
          keymap.of([...searchKeymap, ...historyKeymap, ...defaultKeymap]),
          editorChrome,
          ...preferenceExtensions(getEditorPreferences()),
          strings.current.of([]),
          EditorView.contentAttributes.of({ "aria-multiline": "true" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const text = update.state.doc.toString()
              report(text)
              callbacks.current.onEdit()
              clearTimeout(timer)
              timer = setTimeout(
                () => setCounts(countText(text, callbacks.current.locale)),
                COUNT_DELAY_MS
              )
            }
            if (update.docChanged || update.transactions.length > 0)
              callbacks.current.onCommandsChange?.({
                undo: undoDepth(update.state) > 0,
                redo: redoDepth(update.state) > 0,
                find: true,
              })
          }),
        ],
      }),
    })
    view.current = editor
    callbacks.current.onCommandsChange?.({
      undo: false,
      redo: false,
      find: true,
    })
    return () => {
      clearTimeout(timer)
      editor.destroy()
      view.current = null
    }
    // The editor keeps its own document; `initial` seeds it once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (view.current) reconfigurePreferences(view.current, preferences)
  }, [preferences])

  useEffect(() => {
    view.current?.dispatch({
      effects: strings.current.reconfigure([
        EditorState.phrases.of(codemirrorPhrases[locale]),
        placeholder(t.placeholder),
        EditorView.contentAttributes.of({ "aria-label": t.surface(title) }),
      ]),
    })
  }, [locale, title, t])

  useImperativeHandle(ref, () => ({
    serialize: async () =>
      serializeText(
        view.current?.state.doc.toString() ?? saved.current,
        formatRef.current
      ),
    markSaved: (token) => {
      saved.current = token as string
      report(view.current?.state.doc.toString() ?? saved.current)
    },
    replaceContent: (bytes) => {
      // Decode first: an unsupported file throws and leaves the buffer alone.
      const next = textDocuments.load(bytes)
      const editor = view.current
      saved.current = next.text
      setFormat(next.format)
      editor?.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: next.text },
        userEvent: "input.replace",
      })
      report(next.text)
    },
    draft: () => view.current?.state.doc.toString() ?? saved.current,
    run: (command) => {
      const editor = view.current
      if (!editor) return false
      const action =
        command === "undo"
          ? undo
          : command === "redo"
            ? redo
            : command === "find"
              ? openSearchPanel
              : null
      if (!action) return false
      action(editor)
      editor.focus()
      return true
    },
    focus: () => view.current?.focus(),
  }))

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {showMixed ? (
        <Alert className="m-2 w-auto">
          <AlertDescription>
            {t.mixedEndings(format.lineEnding)}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowMixed(false)}
            >
              {t.dismiss}
            </Button>
          </AlertAction>
        </Alert>
      ) : null}
      <div ref={host} className="flex min-h-0 min-w-0 flex-1 flex-col" />
      {/* Reachable with Tab after the editor, so the counts can be read by keyboard. */}
      <div
        role="status"
        aria-label={t.status}
        tabIndex={0}
        className="flex h-7 shrink-0 items-center gap-2 border-t px-3 text-xs text-muted-foreground tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span>{t.counts(counts.words, counts.characters)}</span>
        <span
          aria-hidden="true"
          className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
        />
        <span>{t.format(format.encoding, format.bom, format.lineEnding)}</span>
      </div>
    </div>
  )
}
