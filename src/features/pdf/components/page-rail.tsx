import { useId, useState, type KeyboardEvent } from "react"

import { cn } from "cn"
import { useMessages } from "@/lib/i18n"

import { outerSize, layerTransform } from "../lib/geometry"
import { sourceIndex, type PageId } from "../lib/model"
import type { OpenPdf, PdfPageInfo } from "../lib/pdfium"
import { pdfMessages } from "../messages"
import { PageCanvas } from "./page-canvas"

/** Thumbnails fit this box (CSS pixels) whatever their size or rotation. */
const THUMB_BOX = { width: 120, height: 160 }

/**
 * Page thumbnails as a single-select listbox. Arrow keys choose a page;
 * Alt with an arrow moves it, R and Shift+R rotate it, and Delete removes
 * it, so every drag action also works from the keyboard.
 */
export function PageRail({
  pdf,
  pages,
  order,
  turns,
  current,
  onSelect,
  onMove,
  onRotate,
  onDelete,
}: {
  pdf: OpenPdf | null
  pages: PdfPageInfo[]
  order: PageId[]
  /** Total quarter turns shown per page (its own plus edits). */
  turns: (page: PageId) => number
  current: PageId
  onSelect: (page: PageId) => void
  onMove: (page: PageId, to: number) => void
  onRotate: (page: PageId, turns: 1 | 3) => void
  onDelete: (page: PageId) => void
}) {
  const t = useMessages(pdfMessages)
  const id = useId()
  const help = `${id}-help`
  const [dragged, setDragged] = useState<PageId | null>(null)
  const position = order.indexOf(current)

  const onKeyDown = (event: KeyboardEvent) => {
    const key = event.key
    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault()
      const step = key === "ArrowUp" ? -1 : 1
      const target = position + step
      if (target < 0 || target >= order.length) return
      if (event.altKey) onMove(current, target)
      else onSelect(order[target])
    } else if (key === "Home" || key === "End") {
      event.preventDefault()
      onSelect(order[key === "Home" ? 0 : order.length - 1])
    } else if (key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      onRotate(current, event.shiftKey ? 3 : 1)
    } else if (key === "Delete") {
      event.preventDefault()
      onDelete(current)
    }
  }

  return (
    <div className="flex w-40 shrink-0 flex-col border-r">
      <p id={help} className="sr-only">
        {t.railHelp}
      </p>
      <div
        role="listbox"
        tabIndex={0}
        aria-label={t.pages}
        aria-describedby={help}
        aria-activedescendant={`${id}-${current}`}
        onKeyDown={onKeyDown}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {order.map((page, index) => {
          const info = pages[sourceIndex(page)]
          const turned = turns(page) % 2 === 1
          const scale = Math.min(
            THUMB_BOX.width / (turned ? info.height : info.width),
            THUMB_BOX.height / (turned ? info.width : info.height)
          )
          const frame = { ...info, scale, turns: turns(page) }
          const size = outerSize(frame)
          const selected = page === current
          return (
            <div
              key={page}
              id={`${id}-${page}`}
              role="option"
              aria-selected={selected}
              aria-label={t.pageLabel(index + 1)}
              draggable
              onDragStart={(event) => {
                setDragged(page)
                event.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={(event) => {
                if (dragged) event.preventDefault()
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (dragged && dragged !== page) onMove(dragged, index)
                setDragged(null)
              }}
              onDragEnd={() => setDragged(null)}
              onClick={() => onSelect(page)}
              className={cn(
                "flex cursor-default flex-col items-center gap-1 rounded-md p-1 text-xs text-muted-foreground transition-colors hover:bg-muted",
                selected && "bg-muted text-foreground"
              )}
            >
              <div
                className="relative overflow-hidden bg-white ring-1 ring-border"
                style={size}
              >
                <div
                  className="absolute top-0 left-0 origin-top-left"
                  style={{ transform: layerTransform(frame) }}
                >
                  {pdf ? (
                    <PageCanvas
                      pdf={pdf}
                      index={sourceIndex(page)}
                      width={info.width}
                      height={info.height}
                      cssScale={scale}
                    />
                  ) : null}
                </div>
              </div>
              <span aria-hidden="true">{index + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
