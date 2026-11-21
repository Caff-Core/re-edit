import { Redo2Icon, Undo2Icon } from "lucide-react"
import { useCallback, useRef, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { HistoryState } from "../lib/extensions"
import { MarkdownEditor, type MarkdownEditorHandle } from "./markdown-editor"

export interface MarkdownDocumentProps {
  name: string
  initialValue: string
}

function ToolbarAction({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-keyshortcuts={shortcut}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label} ({shortcut.split(" ")[0].replace("Control", "Ctrl")})
      </TooltipContent>
    </Tooltip>
  )
}

/** One open Markdown buffer: a toolbar and the editing surface. */
export function MarkdownDocument({ name, initialValue }: MarkdownDocumentProps) {
  const editor = useRef<MarkdownEditorHandle>(null)
  const [history, setHistory] = useState<HistoryState>({
    canUndo: false,
    canRedo: false,
  })

  const onHistoryChange = useCallback((next: HistoryState) => {
    setHistory((prev) =>
      prev.canUndo === next.canUndo && prev.canRedo === next.canRedo ? prev : next
    )
  }, [])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <span className="truncate text-sm font-medium">{name}</span>
        <div role="toolbar" aria-label="Edit" className="ml-auto flex items-center gap-1">
          <ToolbarAction
            label="Undo"
            shortcut="Control+Z"
            disabled={!history.canUndo}
            onClick={() => editor.current?.undo()}
          >
            <Undo2Icon aria-hidden="true" />
          </ToolbarAction>
          <ToolbarAction
            label="Redo"
            shortcut="Control+Y Control+Shift+Z"
            disabled={!history.canRedo}
            onClick={() => editor.current?.redo()}
          >
            <Redo2Icon aria-hidden="true" />
          </ToolbarAction>
        </div>
      </div>
      <MarkdownEditor
        ref={editor}
        initialValue={initialValue}
        label={`${name}, Markdown source`}
        onHistoryChange={onHistoryChange}
      />
    </div>
  )
}
