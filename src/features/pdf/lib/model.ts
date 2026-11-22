/**
 * The PDF document model: the source file never changes, and every edit is an
 * operation in a log. Pages are named by their place in the source ("p0",
 * "p1", ...), so annotations and form values stay on their page however the
 * pages are reordered, rotated, or deleted.
 */

export type PageId = string

/** A rectangle in PDF user space (points, origin at the bottom left). */
export interface Rect {
  left: number
  bottom: number
  right: number
  top: number
}

export type AnnotationKind = "highlight" | "comment" | "textbox"

/** An annotation added in the editor. Annotations already in the file are kept as they are. */
export interface EditorAnnotation {
  id: string
  page: PageId
  kind: AnnotationKind
  /** Bounds: the note icon for a comment, the box for a text box, the union of quads for a highlight. */
  rect: Rect
  /** Comment or text box text; empty for a highlight. */
  text: string
  /** Highlighted line boxes; empty for other kinds. */
  quads: Rect[]
}

export type FieldValue =
  | { kind: "text"; text: string }
  | { kind: "checked"; checked: boolean }
  /** A dropdown option, or the export value of the chosen radio button. */
  | { kind: "choice"; value: string }

export type PdfOp =
  /** Clockwise quarter turns added to the page's rotation. */
  | { type: "rotate"; page: PageId; turns: 1 | 2 | 3 }
  | { type: "move"; page: PageId; to: number }
  | { type: "delete"; page: PageId }
  | { type: "addAnnotation"; annotation: EditorAnnotation }
  | { type: "updateAnnotation"; id: string; rect?: Rect; text?: string }
  | { type: "removeAnnotation"; id: string }
  | { type: "setField"; name: string; value: FieldValue }

export interface PdfState {
  /** Pages in their current order; deleted pages are gone. */
  order: PageId[]
  /** Quarter turns added to each page's own rotation. */
  turns: Record<PageId, number>
  annotations: EditorAnnotation[]
  fields: Record<string, FieldValue>
}

export const pageId = (sourceIndex: number): PageId => `p${sourceIndex}`
export const sourceIndex = (page: PageId) => Number(page.slice(1))

/** The document after applying `ops` to a source with `pageCount` pages. */
export function derive(pageCount: number, ops: readonly PdfOp[]): PdfState {
  let order = Array.from({ length: pageCount }, (_, i) => pageId(i))
  const turns: Record<PageId, number> = {}
  let annotations: EditorAnnotation[] = []
  const fields: Record<string, FieldValue> = {}
  for (const op of ops) {
    switch (op.type) {
      case "rotate":
        turns[op.page] = ((turns[op.page] ?? 0) + op.turns) % 4
        break
      case "move": {
        if (!order.includes(op.page)) break
        const rest = order.filter((p) => p !== op.page)
        const to = Math.max(0, Math.min(op.to, rest.length))
        order = [...rest.slice(0, to), op.page, ...rest.slice(to)]
        break
      }
      case "delete":
        // The last page is never deleted (REQ-018).
        if (order.length > 1) order = order.filter((p) => p !== op.page)
        break
      case "addAnnotation":
        annotations = [...annotations, op.annotation]
        break
      case "updateAnnotation":
        annotations = annotations.map((a) =>
          a.id === op.id
            ? {
                ...a,
                ...(op.text === undefined ? {} : { text: op.text }),
                ...(op.rect === undefined ? {} : moveTo(a, op.rect)),
              }
            : a
        )
        break
      case "removeAnnotation":
        annotations = annotations.filter((a) => a.id !== op.id)
        break
      case "setField":
        fields[op.name] = op.value
        break
    }
  }
  // Annotations on deleted pages go with them.
  const kept = new Set(order)
  return {
    order,
    turns,
    annotations: annotations.filter((a) => kept.has(a.page)),
    fields,
  }
}

/** Moving an annotation moves its quads by the same offset. */
function moveTo(annotation: EditorAnnotation, rect: Rect) {
  const dx = rect.left - annotation.rect.left
  const dy = rect.bottom - annotation.rect.bottom
  return {
    rect,
    quads: annotation.quads.map((q) => ({
      left: q.left + dx,
      right: q.right + dx,
      bottom: q.bottom + dy,
      top: q.top + dy,
    })),
  }
}

/** The ordered edits and how many of them are in effect (the rest can be redone). */
export interface EditLog {
  ops: readonly PdfOp[]
  cursor: number
}

export const emptyLog: EditLog = { ops: [], cursor: 0 }

export const effective = (log: EditLog) => log.ops.slice(0, log.cursor)

/**
 * Adds an edit, dropping anything undone. Typing in the same text field, or
 * repeated nudges of the same annotation, merge into one undo step.
 */
export function push(log: EditLog, op: PdfOp): EditLog {
  const kept = log.ops.slice(0, log.cursor)
  const last = kept.at(-1)
  const merges =
    last !== undefined &&
    ((last.type === "setField" &&
      op.type === "setField" &&
      last.name === op.name &&
      last.value.kind === "text" &&
      op.value.kind === "text") ||
      (last.type === "updateAnnotation" &&
        op.type === "updateAnnotation" &&
        last.id === op.id &&
        last.text === undefined &&
        op.text === undefined) ||
      (last.type === "updateAnnotation" &&
        op.type === "updateAnnotation" &&
        last.id === op.id &&
        last.rect === undefined &&
        op.rect === undefined))
  const ops = merges ? [...kept.slice(0, -1), op] : [...kept, op]
  return { ops, cursor: ops.length }
}

export const canUndo = (log: EditLog) => log.cursor > 0
export const canRedo = (log: EditLog) => log.cursor < log.ops.length
export const undo = (log: EditLog): EditLog =>
  canUndo(log) ? { ...log, cursor: log.cursor - 1 } : log
export const redo = (log: EditLog): EditLog =>
  canRedo(log) ? { ...log, cursor: log.cursor + 1 } : log

/** True when two effective edit lists are the same edits (the saved check). */
export const sameEdits = (a: readonly PdfOp[], b: readonly PdfOp[]) =>
  a.length === b.length && a.every((op, i) => op === b[i])

/** One character of a page's text layer, from PDFium. */
export interface PageChar {
  rect: Rect
}

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top

/**
 * The line boxes covering the characters a dragged rectangle touches: one
 * quad per text line, so a highlight follows the text instead of the drag.
 */
export function quadsFor(chars: readonly PageChar[], selection: Rect): Rect[] {
  const lines: Rect[] = []
  for (const { rect } of chars) {
    if (rect.right <= rect.left || !overlaps(rect, selection)) continue
    const middle = (rect.bottom + rect.top) / 2
    const line = lines.find((l) => middle > l.bottom && middle < l.top)
    if (line) {
      line.left = Math.min(line.left, rect.left)
      line.right = Math.max(line.right, rect.right)
      line.bottom = Math.min(line.bottom, rect.bottom)
      line.top = Math.max(line.top, rect.top)
    } else lines.push({ ...rect })
  }
  return lines.sort((a, b) => b.top - a.top)
}

export const union = (rects: readonly Rect[]): Rect => ({
  left: Math.min(...rects.map((r) => r.left)),
  bottom: Math.min(...rects.map((r) => r.bottom)),
  right: Math.max(...rects.map((r) => r.right)),
  top: Math.max(...rects.map((r) => r.top)),
})

/** Reads a stored draft (the effective edits as JSON). Malformed input gives no edits. */
export function parseDraft(draft: string): PdfOp[] {
  try {
    const value: unknown = JSON.parse(draft)
    return Array.isArray(value)
      ? value.filter(
          (op): op is PdfOp =>
            typeof op === "object" && op !== null && "type" in op
        )
      : []
  } catch {
    return []
  }
}
