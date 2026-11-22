import { MessageSquareTextIcon } from "lucide-react"
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react"

import { cn } from "cn"
import { useMessages } from "@/lib/i18n"

import {
  layerTransform,
  outerSize,
  rectFrom,
  toLayer,
  toPage,
  type PageFrame,
} from "../lib/geometry"
import {
  quadsFor,
  union,
  type EditorAnnotation,
  type FieldValue,
  type PageChar,
  type Rect,
} from "../lib/model"
import type { OpenPdf, PdfField, PdfPageInfo, PdfWidget } from "../lib/pdfium"
import { pdfMessages, type PdfMessages } from "../messages"
import { PageCanvas } from "./page-canvas"

export type Tool = "select" | "highlight" | "comment" | "textbox"

/** Size of a new comment icon and text box, in points. */
const COMMENT_SIZE = 20
const TEXTBOX = { width: 160, height: 24 }
/** Highlight color as saved in the file (page content, not a theme token). */
const HIGHLIGHT_FILL = "rgba(255, 230, 0, 0.4)"

export interface NewAnnotation {
  kind: EditorAnnotation["kind"]
  rect: Rect
  text: string
  quads: Rect[]
}

interface Props {
  pdf: OpenPdf | null
  index: number
  number: number
  info: PdfPageInfo
  turns: number
  zoom: number
  tool: Tool
  annotations: EditorAnnotation[]
  widgets: { field: PdfField; widget: PdfWidget }[]
  values: Record<string, FieldValue>
  selected: string | null
  editing: string | null
  chars: () => PageChar[]
  onSelect: (id: string | null) => void
  onEdit: (id: string | null) => void
  onAdd: (annotation: NewAnnotation) => void
  onUpdate: (id: string, change: { rect?: Rect; text?: string }) => void
  onRemove: (annotation: EditorAnnotation) => void
  onField: (name: string, value: FieldValue) => void
  onNavigate: (step: -1 | 1) => void
  onZoom: (step: -1 | 1) => void
  announce: (message: string) => void
}

function annotationLabel(t: PdfMessages, a: EditorAnnotation) {
  return a.kind === "highlight"
    ? t.highlightLabel
    : a.kind === "comment"
      ? t.commentLabel(a.text)
      : t.textboxLabel(a.text)
}

const offset = (rect: Rect, dx: number, dy: number): Rect => ({
  left: rect.left + dx,
  right: rect.right + dx,
  bottom: rect.bottom + dy,
  top: rect.top + dy,
})

/**
 * One page: the PDFium rendering, the annotations added in the editor, and
 * the form fields, all in page coordinates inside a layer that turns with
 * the page.
 */
export function PageView(props: Props) {
  const {
    pdf,
    index,
    number,
    info,
    turns,
    zoom,
    tool,
    annotations,
    widgets,
    values,
    selected,
    editing,
  } = props
  const t = useMessages(pdfMessages)
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const scale = zoom * (96 / 72)
  const frame: PageFrame = { ...info, scale, turns }
  const size = outerSize(frame)
  const [drag, setDrag] = useState<{
    start: { x: number; y: number }
    end: { x: number; y: number }
  } | null>(null)
  const [moving, setMoving] = useState<{
    id: string
    start: { x: number; y: number }
    dx: number
    dy: number
  } | null>(null)

  const pagePoint = (event: PointerEvent) => {
    const bounds = box.current!.getBoundingClientRect()
    return toPage(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
      frame
    )
  }

  const add = (kind: "comment" | "textbox", x: number, y: number) => {
    const size =
      kind === "comment"
        ? { width: COMMENT_SIZE, height: COMMENT_SIZE }
        : TEXTBOX
    const left = Math.max(0, Math.min(x, info.width - size.width))
    const top = Math.min(info.height, Math.max(y, size.height))
    props.onAdd({
      kind,
      rect: { left, top, right: left + size.width, bottom: top - size.height },
      text: kind === "textbox" ? t.newTextbox : "",
      quads: [],
    })
  }

  const highlight = (selection: Rect) => {
    const chars = props.chars()
    if (chars.length === 0) return props.announce(t.scannedPage)
    const quads = quadsFor(chars, selection)
    if (quads.length === 0) return props.announce(t.noText)
    props.onAdd({ kind: "highlight", rect: union(quads), text: "", quads })
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return
    const point = pagePoint(event)
    if (tool === "select") return props.onSelect(null)
    if (tool === "highlight") {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      setDrag({ start: point, end: point })
      return
    }
    add(tool, point.x, point.y)
  }

  const onSurfaceKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault()
      props.onNavigate(event.key === "PageUp" ? -1 : 1)
    } else if (event.key === "+" || event.key === "-") {
      event.preventDefault()
      props.onZoom(event.key === "+" ? 1 : -1)
    } else if (
      event.key === "Enter" &&
      (tool === "comment" || tool === "textbox")
    ) {
      event.preventDefault()
      add(tool, info.width / 2 - 40, info.height / 2 + 12)
    }
  }

  const onAnnotationKey = (
    event: KeyboardEvent<HTMLElement>,
    a: EditorAnnotation
  ) => {
    const step = event.shiftKey ? 10 : 1
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      props.onUpdate(a.id, { rect: offset(a.rect, move[0], move[1]) })
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      props.onRemove(a)
      // The focused annotation is gone: keep focus on its page.
      surface.current?.focus()
    } else if (event.key === "Enter" && a.kind !== "highlight") {
      event.preventDefault()
      props.onEdit(a.id)
    } else if (event.key === "Escape") {
      props.onSelect(null)
    }
  }

  const startMove = (event: PointerEvent<HTMLElement>, a: EditorAnnotation) => {
    props.onSelect(a.id)
    if (tool !== "select" || event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setMoving({ id: a.id, start: pagePoint(event), dx: 0, dy: 0 })
  }

  const dragRect = drag ? rectFrom(drag.start, drag.end) : null

  return (
    <div
      ref={box}
      className="relative shrink-0 bg-white shadow-sm ring-1 ring-border"
      style={size}
    >
      <p id={`${id}-help`} className="sr-only">
        {t.surfaceHelp(tool)}
      </p>
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: info.width * scale,
          height: info.height * scale,
          transform: layerTransform(frame),
        }}
      >
        {pdf ? (
          <PageCanvas
            pdf={pdf}
            index={index}
            width={info.width}
            height={info.height}
            cssScale={scale}
          />
        ) : null}

        {widgets.map(({ field, widget }) => (
          <FieldControl
            key={`${field.name}-${widget.exportValue}-${widget.rect.left}`}
            groupName={`${id}-${field.name}`}
            field={field}
            widget={widget}
            value={values[field.name]}
            style={toLayer(widget.rect, frame)}
            fontSize={Math.max(
              10,
              (widget.rect.top - widget.rect.bottom) * scale * 0.6
            )}
            onChange={(value) => props.onField(field.name, value)}
            announce={props.announce}
          />
        ))}

        {annotations.map((a) => {
          const moved =
            moving?.id === a.id ? offset(a.rect, moving.dx, moving.dy) : a.rect
          const css = toLayer(moved, frame)
          const isSelected = selected === a.id
          if (editing === a.id && a.kind !== "highlight")
            return (
              <AnnotationText
                key={a.id}
                annotation={a}
                style={css}
                fontSize={12 * scale}
                label={a.kind === "comment" ? t.commentText : t.textboxText}
                onChange={(text) => props.onUpdate(a.id, { text })}
                onDone={() => props.onEdit(null)}
              />
            )
          return (
            <button
              key={a.id}
              type="button"
              aria-label={annotationLabel(t, a)}
              aria-describedby={`${id}-annotation-help`}
              onPointerDown={(event) => startMove(event, a)}
              onPointerMove={(event) => {
                if (moving?.id !== a.id) return
                const point = pagePoint(event)
                setMoving({
                  ...moving,
                  dx: point.x - moving.start.x,
                  dy: point.y - moving.start.y,
                })
              }}
              onPointerUp={() => {
                if (moving?.id === a.id && (moving.dx || moving.dy))
                  props.onUpdate(a.id, { rect: moved })
                setMoving(null)
              }}
              onFocus={() => props.onSelect(a.id)}
              onKeyDown={(event) => onAnnotationKey(event, a)}
              onDoubleClick={() => a.kind !== "highlight" && props.onEdit(a.id)}
              className={cn(
                "absolute touch-none outline-none",
                isSelected && "ring-2 ring-ring ring-offset-1",
                a.kind === "textbox" &&
                  "overflow-hidden border border-neutral-900 text-left whitespace-pre-wrap text-neutral-900",
                a.kind === "comment" &&
                  "flex items-center justify-center rounded-sm bg-amber-300 text-neutral-900"
              )}
              style={{
                ...css,
                fontSize: a.kind === "textbox" ? 12 * scale : undefined,
                lineHeight: 1.2,
                padding: a.kind === "textbox" ? 2 * scale : 0,
              }}
            >
              {a.kind === "highlight" ? (
                a.quads.map((q, i) => {
                  const quad = toLayer(q, frame)
                  return (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="absolute mix-blend-multiply"
                      style={{
                        left: quad.left - css.left,
                        top: quad.top - css.top,
                        width: quad.width,
                        height: quad.height,
                        background: HIGHLIGHT_FILL,
                      }}
                    />
                  )
                })
              ) : a.kind === "comment" ? (
                <MessageSquareTextIcon
                  aria-hidden="true"
                  className="size-4/5"
                />
              ) : (
                a.text
              )}
            </button>
          )
        })}

        {dragRect ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border border-dashed border-primary"
            style={{ ...toLayer(dragRect, frame), background: HIGHLIGHT_FILL }}
          />
        ) : null}
      </div>
      <p id={`${id}-annotation-help`} className="sr-only">
        {t.annotationHelp}
      </p>
      {/* The page surface: the tools act on it, and it takes focus for keyboard adds. */}
      <div
        ref={surface}
        role="group"
        tabIndex={0}
        aria-label={t.pageSurface(number)}
        aria-describedby={`${id}-help`}
        onPointerDown={onPointerDown}
        onPointerMove={(event) =>
          drag && setDrag({ ...drag, end: pagePoint(event) })
        }
        onPointerUp={() => {
          if (dragRect) highlight(dragRect)
          setDrag(null)
        }}
        onKeyDown={onSurfaceKey}
        className={cn(
          "absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          tool === "select" ? "pointer-events-none" : "cursor-crosshair"
        )}
      />
    </div>
  )
}

function AnnotationText({
  annotation,
  style,
  fontSize,
  label,
  onChange,
  onDone,
}: {
  annotation: EditorAnnotation
  style: { left: number; top: number; width: number; height: number }
  fontSize: number
  label: string
  onChange: (text: string) => void
  onDone: () => void
}) {
  const comment = annotation.kind === "comment"
  return (
    <textarea
      aria-label={label}
      autoFocus
      defaultValue={annotation.text}
      // A new text box starts with placeholder text: select it so typing replaces it.
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onDone}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          onDone()
        }
      }}
      className="absolute z-10 resize-none border border-input bg-background p-1 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={
        comment
          ? {
              left: style.left,
              top: style.top + style.height + 4,
              width: "14rem",
              height: "6rem",
            }
          : { ...style, fontSize, minHeight: style.height }
      }
    />
  )
}

/**
 * A form field over its widget. Text, checkbox, radio, and dropdown fields
 * are real controls; other kinds and read-only fields explain why they
 * cannot be filled and keep their value.
 */
function FieldControl({
  groupName,
  field,
  widget,
  value,
  style,
  fontSize,
  onChange,
  announce,
}: {
  groupName: string
  field: PdfField
  widget: PdfWidget
  value: FieldValue | undefined
  style: { left: number; top: number; width: number; height: number }
  fontSize: number
  onChange: (value: FieldValue) => void
  announce: (message: string) => void
}) {
  const t = useMessages(pdfMessages)
  const base =
    "absolute border border-blue-500/60 bg-blue-50/70 text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-blue-400/60"
  if (field.kind === "unsupported" || field.readOnly) {
    const message = field.readOnly
      ? t.readOnlyField(field.name)
      : t.unsupportedField(field.name)
    return (
      <button
        type="button"
        aria-label={message}
        title={message}
        onClick={() => announce(message)}
        className="absolute flex items-start justify-end border border-dashed border-neutral-500 bg-transparent p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={style}
      >
        <span className="rounded-sm bg-neutral-800 px-1 text-xs text-white">
          {t.unsupportedHint}
        </span>
      </button>
    )
  }
  switch (field.kind) {
    case "text":
      return (
        <input
          aria-label={t.fieldLabel(field.name)}
          value={value?.kind === "text" ? value.text : field.value}
          onChange={(event) =>
            onChange({ kind: "text", text: event.target.value })
          }
          className={cn(base, "px-1")}
          style={{ ...style, fontSize }}
        />
      )
    case "checkbox":
      return (
        <input
          type="checkbox"
          aria-label={t.fieldLabel(field.name)}
          checked={value?.kind === "checked" ? value.checked : widget.checked}
          onChange={(event) =>
            onChange({ kind: "checked", checked: event.target.checked })
          }
          className={cn(base, "m-0 accent-primary")}
          style={style}
        />
      )
    case "radio": {
      const chosen =
        value?.kind === "choice"
          ? value.value === widget.exportValue
          : widget.checked
      return (
        <input
          type="radio"
          name={groupName}
          aria-label={`${t.fieldLabel(field.name)}: ${widget.exportValue}`}
          checked={chosen}
          onChange={() =>
            onChange({ kind: "choice", value: widget.exportValue })
          }
          className={cn(base, "m-0 accent-primary")}
          style={style}
        />
      )
    }
    case "dropdown":
      return (
        // A native select fits the widget's exact rectangle on the page and
        // matches what PDF viewers show for a combo box field.
        <select
          aria-label={t.fieldLabel(field.name)}
          value={value?.kind === "choice" ? value.value : field.value}
          onChange={(event) =>
            onChange({ kind: "choice", value: event.target.value })
          }
          className={base}
          style={{ ...style, fontSize }}
        >
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
  }
}
