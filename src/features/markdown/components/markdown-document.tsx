import { openSearchPanel } from "@codemirror/search"
import type { Command } from "@codemirror/view"
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  Redo2Icon,
  SearchIcon,
  TableIcon,
  Undo2Icon,
} from "lucide-react"
import { useCallback, useRef, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { insertLink, toggleInline } from "../lib/commands/formatting"
import {
  addTableColumn,
  addTableRow,
  deleteTableColumn,
  deleteTableRow,
  formatCurrentTable,
  insertTable,
} from "../lib/commands/table"
import type { EditorStatus } from "../lib/extensions"
import { SHORTCUTS } from "../lib/keymap"
import { MarkdownEditor, type MarkdownEditorHandle } from "./markdown-editor"

export interface MarkdownDocumentProps {
  name: string
  initialValue: string
}

/** "Ctrl+Shift+Enter" -> "Control+Shift+Enter" for aria-keyshortcuts. */
function ariaShortcut(shortcut: string) {
  return shortcut
    .replace("Ctrl", "Control")
    .replace("Right", "ArrowRight")
    .replace("Left", "ArrowLeft")
}

function ToolbarAction({
  label,
  shortcut,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  shortcut: string
  disabled?: boolean
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
            aria-keyshortcuts={ariaShortcut(shortcut)}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label} ({shortcut})
      </TooltipContent>
    </Tooltip>
  )
}

const bold = toggleInline("**")
const italic = toggleInline("_")
const code = toggleInline("`")

/** One open Markdown buffer: a toolbar, the editing surface, and a live region. */
export function MarkdownDocument({ name, initialValue }: MarkdownDocumentProps) {
  const editor = useRef<MarkdownEditorHandle>(null)
  const [status, setStatus] = useState<EditorStatus>({
    canUndo: false,
    canRedo: false,
    inTable: false,
  })
  const [announcement, setAnnouncement] = useState("")

  const onStatusChange = useCallback((next: EditorStatus) => {
    setStatus((prev) =>
      prev.canUndo === next.canUndo &&
      prev.canRedo === next.canRedo &&
      prev.inTable === next.inTable
        ? prev
        : next
    )
  }, [])

  const runCommand = useCallback((command: Command) => {
    editor.current?.execute(command)
  }, [])

  const tableItems = [
    { label: "Add row below", shortcut: SHORTCUTS.addRow, command: addTableRow },
    { label: "Add column right", shortcut: SHORTCUTS.addColumn, command: addTableColumn },
    { label: "Delete row", shortcut: SHORTCUTS.deleteRow, command: deleteTableRow },
    { label: "Delete column", shortcut: SHORTCUTS.deleteColumn, command: deleteTableColumn },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <span className="truncate text-sm font-medium">{name}</span>
        <div
          role="toolbar"
          aria-label="Edit"
          className="ml-auto flex items-center gap-1"
        >
          <ToolbarAction
            label="Undo"
            shortcut={SHORTCUTS.undo}
            disabled={!status.canUndo}
            onClick={() => editor.current?.undo()}
          >
            <Undo2Icon aria-hidden="true" />
          </ToolbarAction>
          <ToolbarAction
            label="Redo"
            shortcut={SHORTCUTS.redo}
            disabled={!status.canRedo}
            onClick={() => editor.current?.redo()}
          >
            <Redo2Icon aria-hidden="true" />
          </ToolbarAction>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <ToolbarAction label="Bold" shortcut={SHORTCUTS.bold} onClick={() => runCommand(bold)}>
            <BoldIcon aria-hidden="true" />
          </ToolbarAction>
          <ToolbarAction label="Italic" shortcut={SHORTCUTS.italic} onClick={() => runCommand(italic)}>
            <ItalicIcon aria-hidden="true" />
          </ToolbarAction>
          <ToolbarAction label="Inline code" shortcut={SHORTCUTS.code} onClick={() => runCommand(code)}>
            <CodeIcon aria-hidden="true" />
          </ToolbarAction>
          <ToolbarAction label="Link" shortcut={SHORTCUTS.link} onClick={() => runCommand(insertLink)}>
            <LinkIcon aria-hidden="true" />
          </ToolbarAction>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Table"
                      />
                    }
                  />
                }
              >
                <TableIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Table</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={() => runCommand(insertTable)}>
                Insert table
                <DropdownMenuShortcut>{SHORTCUTS.insertTable}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {status.inTable ? "Current table" : "Place the cursor in a table"}
                </DropdownMenuLabel>
                {tableItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    disabled={!status.inTable}
                    onClick={() => runCommand(item.command)}
                  >
                    {item.label}
                    <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  disabled={!status.inTable}
                  onClick={() => runCommand(formatCurrentTable)}
                >
                  Align columns
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolbarAction
            label="Find and replace"
            shortcut={SHORTCUTS.find}
            onClick={() => runCommand(openSearchPanel)}
          >
            <SearchIcon aria-hidden="true" />
          </ToolbarAction>
        </div>
      </div>
      <MarkdownEditor
        ref={editor}
        initialValue={initialValue}
        label={`${name}, Markdown source`}
        onStatusChange={onStatusChange}
        onAnnounce={setAnnouncement}
      />
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
