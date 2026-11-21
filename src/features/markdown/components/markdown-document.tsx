import { openSearchPanel } from "@codemirror/search"
import type { Command } from "@codemirror/view"
import {
  BoldIcon,
  CodeIcon,
  Columns2Icon,
  EyeIcon,
  PenLineIcon,
  ItalicIcon,
  LinkIcon,
  Redo2Icon,
  SearchIcon,
  TableIcon,
  Undo2Icon,
} from "lucide-react"
import {
  lazy,
  Suspense,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

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
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DocumentEditorProps } from "@/workspace"

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
import { createImageLoader } from "../lib/render/image-loader"
import { SHORTCUTS } from "../lib/keymap"
import { MarkdownEditor, type MarkdownEditorHandle } from "./markdown-editor"

// The render pipeline and syntax grammars load only when a preview is shown.
const MarkdownPreview = lazy(() =>
  import("./markdown-preview").then((module) => ({
    default: module.MarkdownPreview,
  }))
)

function PreviewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading preview"
      className="flex flex-col gap-3 p-6"
    >
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

export type ViewMode = "editor" | "split" | "preview"

const VIEW_MODES: { value: ViewMode; label: string; icon: ReactNode }[] = [
  {
    value: "editor",
    label: "Editor",
    icon: <PenLineIcon aria-hidden="true" />,
  },
  { value: "split", label: "Split", icon: <Columns2Icon aria-hidden="true" /> },
  { value: "preview", label: "Preview", icon: <EyeIcon aria-hidden="true" /> },
]

function isViewMode(value: string | undefined): value is ViewMode {
  return VIEW_MODES.some((mode) => mode.value === value)
}

export type MarkdownDocumentProps = DocumentEditorProps

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

/**
 * One open Markdown buffer: a toolbar, the editing surface, and a live region.
 * Implements the workspace editor contract: it owns dirty detection against
 * the last saved content and serializes the buffer as Markdown text.
 */
export function MarkdownDocument({
  title,
  initialContent,
  savedContent,
  onDirtyChange,
  onEdit,
  path,
  resolveAsset,
  ref,
}: MarkdownDocumentProps) {
  const editor = useRef<MarkdownEditorHandle>(null)
  const saved = useRef(savedContent)
  // A recovered draft starts different from its file, so it starts dirty;
  // the workspace already shows it as dirty.
  const dirty = useRef(initialContent !== savedContent)
  const [status, setStatus] = useState<EditorStatus>({
    canUndo: false,
    canRedo: false,
    inTable: false,
  })
  const [announcement, setAnnouncement] = useState("")
  const [content, setContent] = useState(initialContent)
  const [mode, setMode] = useState<ViewMode>("editor")

  // Each image source resolves once per document location; the workspace
  // gives a stable resolver per document, and a Save As starts a new cache.
  const loadImage = useMemo(
    () => createImageLoader(path, resolveAsset),
    [path, resolveAsset]
  )

  const reportDirty = useCallback(
    (content: string) => {
      const next = content !== saved.current
      if (next !== dirty.current) {
        dirty.current = next
        onDirtyChange(next)
      }
    },
    [onDirtyChange]
  )

  useImperativeHandle(
    ref,
    () => ({
      serialize: () => editor.current?.getValue() ?? saved.current,
      replaceContent: (content, savedContent) => {
        saved.current = savedContent
        editor.current?.replace(content)
        setContent(content)
        reportDirty(content)
      },
      markSaved: (content) => {
        saved.current = content
        reportDirty(editor.current?.getValue() ?? content)
      },
      focus: () => editor.current?.focus(),
    }),
    [reportDirty]
  )

  const onContentChange = useCallback(
    (next: string) => {
      setContent(next)
      reportDirty(next)
      onEdit()
    },
    [reportDirty, onEdit]
  )

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
    {
      label: "Add row below",
      shortcut: SHORTCUTS.addRow,
      command: addTableRow,
    },
    {
      label: "Add column right",
      shortcut: SHORTCUTS.addColumn,
      command: addTableColumn,
    },
    {
      label: "Delete row",
      shortcut: SHORTCUTS.deleteRow,
      command: deleteTableRow,
    },
    {
      label: "Delete column",
      shortcut: SHORTCUTS.deleteColumn,
      command: deleteTableColumn,
    },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <div
          role="toolbar"
          aria-label="Edit"
          className="flex items-center gap-1"
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
          <ToolbarAction
            label="Bold"
            shortcut={SHORTCUTS.bold}
            onClick={() => runCommand(bold)}
          >
            <BoldIcon aria-hidden="true" />
          </ToolbarAction>
          <ToolbarAction
            label="Italic"
            shortcut={SHORTCUTS.italic}
            onClick={() => runCommand(italic)}
          >
            <ItalicIcon aria-hidden="true" />
          </ToolbarAction>
          <ToolbarAction
            label="Inline code"
            shortcut={SHORTCUTS.code}
            onClick={() => runCommand(code)}
          >
            <CodeIcon aria-hidden="true" />
          </ToolbarAction>
          <ToolbarAction
            label="Link"
            shortcut={SHORTCUTS.link}
            onClick={() => runCommand(insertLink)}
          >
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
                <DropdownMenuShortcut>
                  {SHORTCUTS.insertTable}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {status.inTable
                    ? "Current table"
                    : "Place the cursor in a table"}
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
        <ToggleGroup
          aria-label="View"
          size="sm"
          className="ml-auto"
          value={[mode]}
          onValueChange={(next) => {
            const [value] = next
            if (isViewMode(value)) setMode(value)
          }}
        >
          {VIEW_MODES.map((option) => (
            <Tooltip key={option.value}>
              <TooltipTrigger
                render={
                  <ToggleGroupItem
                    value={option.value}
                    aria-label={option.label}
                  />
                }
              >
                {option.icon}
              </TooltipTrigger>
              <TooltipContent>{option.label}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1">
        <div
          hidden={mode === "preview"}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <MarkdownEditor
            ref={editor}
            initialValue={initialContent}
            label={`${title}, Markdown source`}
            onChange={onContentChange}
            onStatusChange={onStatusChange}
            onAnnounce={setAnnouncement}
          />
        </div>
        {mode === "editor" ? null : (
          <section
            aria-label="Preview"
            className={
              mode === "split"
                ? "flex min-h-0 min-w-0 flex-1 flex-col border-l"
                : "flex min-h-0 min-w-0 flex-1 flex-col"
            }
          >
            <Suspense fallback={<PreviewSkeleton />}>
              <MarkdownPreview
                source={content}
                title={title}
                loadImage={loadImage}
              />
            </Suspense>
          </section>
        )}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
