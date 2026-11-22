import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  HighlighterIcon,
  MessageSquarePlusIcon,
  MousePointer2Icon,
  Redo2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMessages } from "@/lib/i18n"
import { useDescribeError } from "@/services/native"
import type { DocumentEditorProps } from "@/workspace"

import type { PdfDocument } from "../document-type"
import { loadPdf } from "../document-type"
import {
  canRedo,
  canUndo,
  derive,
  effective,
  emptyLog,
  push,
  redo,
  sameEdits,
  sourceIndex,
  undo,
  type EditLog,
  type PageChar,
  type PageId,
  type PdfOp,
} from "../lib/model"
import {
  applyEdits,
  closeDocument,
  openDocument,
  readChars,
  type OpenPdf,
} from "../lib/pdfium"
import { pdfMessages } from "../messages"
import { PageRail } from "./page-rail"
import { PageView, type NewAnnotation, type Tool } from "./page-view"

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

const TOOLS: { value: Tool; icon: ReactNode }[] = [
  { value: "select", icon: <MousePointer2Icon aria-hidden="true" /> },
  { value: "highlight", icon: <HighlighterIcon aria-hidden="true" /> },
  { value: "comment", icon: <MessageSquarePlusIcon aria-hidden="true" /> },
  { value: "textbox", icon: <TypeIcon aria-hidden="true" /> },
]

function Action({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
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
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * A PDF tab. The source bytes never change; edits form an undoable log on
 * stable page ids, shown over PDFium's rendering and replayed onto a fresh
 * copy of the source when saving.
 */
export function PdfEditor({
  initial,
  saved,
  onDirtyChange,
  onEdit,
  onCommandsChange,
  ref,
}: DocumentEditorProps<PdfDocument>) {
  const t = useMessages(pdfMessages)
  const describe = useDescribeError()
  const [pdfDocument, setPdfDocument] = useState(initial)
  const [log, setLog] = useState<EditLog>(initial.log)
  const logRef = useRef(log)
  const documentRef = useRef(pdfDocument)
  const savedOps = useRef<readonly PdfOp[]>(effective(saved.log))
  const dirty = useRef(!sameEdits(effective(initial.log), effective(saved.log)))
  const [pdf, setPdf] = useState<OpenPdf | null>(null)
  const [openError, setOpenError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [tool, setTool] = useState<Tool>("select")
  const [zoomIndex, setZoomIndex] = useState(ZOOMS.indexOf(1))
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const chars = useRef(new Map<number, PageChar[]>())
  const root = useRef<HTMLDivElement>(null)

  const state = useMemo(
    () => derive(pdfDocument.info.pages.length, effective(log)),
    [pdfDocument, log]
  )
  const [current, setCurrent] = useState<PageId>(state.order[0])
  const page = state.order.includes(current) ? current : state.order[0]
  const position = state.order.indexOf(page)

  // Open the source once per tab (and again after a reload from disk).
  useEffect(() => {
    let open: OpenPdf | null = null
    let cancelled = false
    openDocument(pdfDocument.source).then(
      (handle) => {
        if (cancelled) {
          closeDocument(handle)
          return
        }
        open = handle
        chars.current.clear()
        setPdf(handle)
      },
      (error) => !cancelled && setOpenError(error)
    )
    return () => {
      cancelled = true
      setPdf(null)
      if (open) closeDocument(open)
    }
  }, [pdfDocument.source, attempt])

  // Dirty: the edits in effect differ from the saved ones.
  useEffect(() => {
    logRef.current = log
    documentRef.current = pdfDocument
    const next = !sameEdits(effective(log), savedOps.current)
    if (next !== dirty.current) {
      dirty.current = next
      onDirtyChange(next)
    }
    onCommandsChange?.({ undo: canUndo(log), redo: canRedo(log) })
  }, [log, pdfDocument, onDirtyChange, onCommandsChange])

  const apply = useCallback(
    (op: PdfOp) => {
      setLog((current) => push(current, op))
      onEdit()
    },
    [onEdit]
  )

  const announce = (message: string) => {
    // Clear first so the same message is read again.
    setAnnouncement("")
    queueMicrotask(() => setAnnouncement(message))
  }

  const step = (direction: "undo" | "redo") => {
    setLog((current) => (direction === "undo" ? undo(current) : redo(current)))
    setEditing(null)
    onEdit()
  }

  useImperativeHandle(ref, () => ({
    serialize: async () => {
      const ops = effective(logRef.current)
      const current = documentRef.current
      return {
        bytes: await applyEdits(current.source, current.info, ops),
        token: ops,
      }
    },
    markSaved: (token) => {
      savedOps.current = token as readonly PdfOp[]
      const next = !sameEdits(effective(logRef.current), savedOps.current)
      if (next !== dirty.current) {
        dirty.current = next
        onDirtyChange(next)
      }
    },
    replaceContent: async (bytes) => {
      // A new version from disk starts a new edit history on that version.
      const next = await loadPdf(bytes)
      savedOps.current = []
      setPdfDocument(next)
      setLog(emptyLog)
      setSelected(null)
      setEditing(null)
    },
    draft: () => JSON.stringify(effective(logRef.current)),
    run: (command) => {
      if (command !== "undo" && command !== "redo") return false
      step(command)
      return true
    },
    focus: () =>
      root.current?.querySelector<HTMLElement>('[role="listbox"]')?.focus(),
  }))

  const pageNumber = (id: PageId) => state.order.indexOf(id) + 1
  const totalTurns = (id: PageId) =>
    pdfDocument.info.pages[sourceIndex(id)].rotation + (state.turns[id] ?? 0)

  const rotate = (id: PageId, turns: 1 | 3) => {
    apply({ type: "rotate", page: id, turns })
    announce(t.rotated(pageNumber(id), ((totalTurns(id) + turns) % 4) * 90))
  }
  const move = (id: PageId, to: number) => {
    if (to < 0 || to >= state.order.length || state.order[to] === id) return
    apply({ type: "move", page: id, to })
    announce(t.moved(pageNumber(id), to + 1))
  }
  const remove = (id: PageId) => {
    if (state.order.length <= 1) return announce(t.lastPage)
    const number = pageNumber(id)
    const next = state.order[position + 1] ?? state.order[position - 1]
    apply({ type: "delete", page: id })
    if (id === page && next) setCurrent(next)
    announce(t.deleted(number))
  }
  const navigate = (direction: -1 | 1) => {
    const target = state.order[position + direction]
    if (target) setCurrent(target)
  }
  const zoom = (direction: -1 | 1) =>
    setZoomIndex((i) => Math.max(0, Math.min(ZOOMS.length - 1, i + direction)))

  const kindLabel = {
    highlight: t.highlight,
    comment: t.comment,
    textbox: t.textbox,
  }
  const add = (annotation: NewAnnotation) => {
    const id = `a${log.cursor + 1}`
    apply({ type: "addAnnotation", annotation: { ...annotation, id, page } })
    setSelected(id)
    if (annotation.kind !== "highlight") setEditing(id)
    announce(t.added(kindLabel[annotation.kind]))
  }

  const sourcePage = sourceIndex(page)
  const pageChars = () => {
    if (!pdf) return []
    let found = chars.current.get(sourcePage)
    if (!found) {
      found = readChars(pdf, sourcePage)
      chars.current.set(sourcePage, found)
    }
    return found
  }

  if (openError)
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>
            {t.couldNotShow} {describe(openError)}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpenError(null)
                setAttempt((n) => n + 1)
              }}
            >
              {t.retry}
            </Button>
          </AlertAction>
        </Alert>
      </div>
    )

  return (
    <div
      ref={root}
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return
        const key = event.key.toLowerCase()
        if (key === "z" || key === "y") {
          event.preventDefault()
          step(key === "y" || event.shiftKey ? "redo" : "undo")
        }
      }}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-b px-3">
        <ToggleGroup
          aria-label={t.tools}
          size="sm"
          value={[tool]}
          onValueChange={(next) => {
            const [value] = next
            if (value) setTool(value as Tool)
          }}
        >
          {TOOLS.map((option) => (
            <Tooltip key={option.value}>
              <TooltipTrigger
                render={
                  <ToggleGroupItem
                    value={option.value}
                    aria-label={t[option.value]}
                  />
                }
              >
                {option.icon}
              </TooltipTrigger>
              <TooltipContent>{t[option.value]}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
        <Separator orientation="vertical" className="my-auto h-4" />
        <div className="flex items-center gap-1">
          <Action
            label={t.undo}
            disabled={!canUndo(log)}
            onClick={() => step("undo")}
          >
            <Undo2Icon aria-hidden="true" />
          </Action>
          <Action
            label={t.redo}
            disabled={!canRedo(log)}
            onClick={() => step("redo")}
          >
            <Redo2Icon aria-hidden="true" />
          </Action>
        </div>
        <Separator orientation="vertical" className="my-auto h-4" />
        <div
          role="toolbar"
          aria-label={t.pageTools}
          className="flex items-center gap-1"
        >
          <Action label={t.rotateLeft} onClick={() => rotate(page, 3)}>
            <RotateCcwIcon aria-hidden="true" />
          </Action>
          <Action label={t.rotateRight} onClick={() => rotate(page, 1)}>
            <RotateCwIcon aria-hidden="true" />
          </Action>
          <Action
            label={t.moveEarlier}
            disabled={position === 0}
            onClick={() => move(page, position - 1)}
          >
            <ChevronUpIcon aria-hidden="true" />
          </Action>
          <Action
            label={t.moveLater}
            disabled={position === state.order.length - 1}
            onClick={() => move(page, position + 1)}
          >
            <ChevronDownIcon aria-hidden="true" />
          </Action>
          <Action
            label={t.deletePage}
            disabled={state.order.length <= 1}
            onClick={() => remove(page)}
          >
            <Trash2Icon aria-hidden="true" />
          </Action>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Action
            label={t.previousPage}
            disabled={position === 0}
            onClick={() => navigate(-1)}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Action>
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {t.pageOf(position + 1, state.order.length)}
          </span>
          <Action
            label={t.nextPage}
            disabled={position === state.order.length - 1}
            onClick={() => navigate(1)}
          >
            <ChevronRightIcon aria-hidden="true" />
          </Action>
          <Separator orientation="vertical" className="my-auto h-4" />
          <Action
            label={t.zoomOut}
            disabled={zoomIndex === 0}
            onClick={() => zoom(-1)}
          >
            <ZoomOutIcon aria-hidden="true" />
          </Action>
          <span className="w-10 text-center text-xs text-muted-foreground tabular-nums">
            {t.zoom(Math.round(ZOOMS[zoomIndex] * 100))}
          </span>
          <Action
            label={t.zoomIn}
            disabled={zoomIndex === ZOOMS.length - 1}
            onClick={() => zoom(1)}
          >
            <ZoomInIcon aria-hidden="true" />
          </Action>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1">
        <PageRail
          pdf={pdf}
          pages={pdfDocument.info.pages}
          order={state.order}
          turns={totalTurns}
          current={page}
          onSelect={setCurrent}
          onMove={move}
          onRotate={rotate}
          onDelete={remove}
        />
        {/* Auto margins center the page and still let a wide page scroll. */}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-auto bg-muted p-6">
          {pdf ? (
            <div className="m-auto">
              <PageView
                key={page}
                pdf={pdf}
                index={sourcePage}
                number={position + 1}
                info={pdfDocument.info.pages[sourcePage]}
                turns={totalTurns(page)}
                zoom={ZOOMS[zoomIndex]}
                tool={tool}
                annotations={state.annotations.filter((a) => a.page === page)}
                widgets={pdfDocument.info.fields.flatMap((field) =>
                  field.widgets
                    .filter((widget) => widget.page === sourcePage)
                    .map((widget) => ({ field, widget }))
                )}
                values={state.fields}
                selected={selected}
                editing={editing}
                chars={pageChars}
                onSelect={setSelected}
                onEdit={setEditing}
                onAdd={add}
                onUpdate={(id, change) =>
                  apply({ type: "updateAnnotation", id, ...change })
                }
                onRemove={(annotation) => {
                  apply({ type: "removeAnnotation", id: annotation.id })
                  setSelected(null)
                  announce(t.removed(kindLabel[annotation.kind]))
                }}
                onField={(name, value) =>
                  apply({ type: "setField", name, value })
                }
                onNavigate={navigate}
                onZoom={zoom}
                announce={announce}
              />
            </div>
          ) : (
            <div
              role="status"
              aria-label={t.loading}
              className="m-auto flex w-full max-w-2xl flex-col gap-3"
            >
              <Skeleton className="aspect-[1/1.41] w-full" />
            </div>
          )}
        </div>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
