import { describe, expect, it } from "vitest"

import { outerSize, toLayer, toPage, type PageFrame } from "./geometry"
import {
  canRedo,
  derive,
  effective,
  emptyLog,
  pageId,
  parseDraft,
  push,
  quadsFor,
  redo,
  undo,
  type EditorAnnotation,
  type PdfOp,
} from "./model"

const box = { left: 10, bottom: 10, right: 50, top: 30 }
const note = (id: string, page: string): EditorAnnotation => ({
  id,
  page,
  kind: "textbox",
  rect: box,
  text: "x",
  quads: [],
})

describe("AC-018: page identity", () => {
  it("keeps annotations on their page through moves and rotation", () => {
    const state = derive(3, [
      { type: "addAnnotation", annotation: note("a", pageId(2)) },
      { type: "move", page: pageId(2), to: 0 },
      { type: "rotate", page: pageId(2), turns: 1 },
      { type: "rotate", page: pageId(2), turns: 3 },
      { type: "rotate", page: pageId(0), turns: 1 },
    ])
    expect(state.order).toEqual(["p2", "p0", "p1"])
    expect(state.annotations[0].page).toBe("p2")
    expect(state.turns).toEqual({ p2: 0, p0: 1 })
  })

  it("drops a deleted page's annotations and never deletes the last page", () => {
    const state = derive(2, [
      { type: "addAnnotation", annotation: note("a", pageId(0)) },
      { type: "delete", page: pageId(0) },
      { type: "delete", page: pageId(1) },
    ])
    expect(state.order).toEqual(["p1"])
    expect(state.annotations).toEqual([])
  })

  it("moves an annotation with its quads and edits its text", () => {
    const highlight: EditorAnnotation = {
      ...note("h", pageId(0)),
      kind: "highlight",
      quads: [box],
    }
    const state = derive(1, [
      { type: "addAnnotation", annotation: highlight },
      {
        type: "updateAnnotation",
        id: "h",
        rect: { left: 20, bottom: 15, right: 60, top: 35 },
      },
      { type: "updateAnnotation", id: "h", text: "new" },
    ])
    expect(state.annotations[0]).toMatchObject({
      text: "new",
      quads: [{ left: 20, bottom: 15, right: 60, top: 35 }],
    })
  })
})

describe("REQ-019: undo and redo", () => {
  it("undoes and redoes in order, and a new edit drops the redo", () => {
    const rotate: PdfOp = { type: "rotate", page: pageId(0), turns: 1 }
    const remove: PdfOp = { type: "delete", page: pageId(1) }
    let log = push(push(emptyLog, rotate), remove)
    log = undo(log)
    expect(effective(log)).toEqual([rotate])
    log = redo(log)
    expect(effective(log)).toEqual([rotate, remove])
    log = push(undo(undo(log)), remove)
    expect(effective(log)).toEqual([remove])
    expect(canRedo(log)).toBe(false)
  })

  it("merges typing in one field and nudges of one annotation into single steps", () => {
    let log = emptyLog
    for (const text of ["A", "Ad", "Ada"])
      log = push(log, {
        type: "setField",
        name: "name",
        value: { kind: "text", text },
      })
    for (const left of [11, 12])
      log = push(log, {
        type: "updateAnnotation",
        id: "a",
        rect: { ...box, left },
      })
    expect(log.ops).toHaveLength(2)
    log = undo(log)
    expect(derive(1, effective(log)).fields.name).toEqual({
      kind: "text",
      text: "Ada",
    })
  })

  it("reads drafts and ignores malformed ones", () => {
    expect(
      parseDraft(JSON.stringify([{ type: "delete", page: "p1" }]))
    ).toEqual([{ type: "delete", page: "p1" }])
    expect(parseDraft("nope")).toEqual([])
    expect(parseDraft('{"type":"delete"}')).toEqual([])
  })
})

describe("REQ-016: highlight quads", () => {
  it("covers the touched characters, one quad per line", () => {
    const char = (left: number, bottom: number) => ({
      rect: { left, right: left + 5, bottom, top: bottom + 10 },
    })
    const chars = [
      char(0, 100),
      char(5, 100),
      char(10, 100),
      char(0, 80),
      char(5, 80),
    ]
    expect(
      quadsFor(chars, { left: 4, right: 9, bottom: 75, top: 105 })
    ).toEqual([
      { left: 0, right: 10, bottom: 100, top: 110 },
      { left: 0, right: 10, bottom: 80, top: 90 },
    ])
    expect(quadsFor([], box)).toEqual([])
  })
})

describe("page geometry", () => {
  const frame = (turns: number): PageFrame => ({
    width: 100,
    height: 200,
    scale: 2,
    turns,
  })

  it("swaps the box for quarter turns", () => {
    expect(outerSize(frame(0))).toEqual({ width: 200, height: 400 })
    expect(outerSize(frame(1))).toEqual({ width: 400, height: 200 })
  })

  it("maps the page's top-left corner to each rotated corner and back", () => {
    // Page point (0, 200) is the top-left of the unrotated page.
    const corners = [
      [0, 0],
      [400, 0],
      [200, 400],
      [0, 200],
    ]
    corners.forEach(([x, y], turns) => {
      expect(toPage(x, y, frame(turns))).toEqual({ x: 0, y: 200 })
    })
    expect(
      toLayer({ left: 10, bottom: 150, right: 20, top: 190 }, frame(0))
    ).toEqual({
      left: 20,
      top: 20,
      width: 20,
      height: 80,
    })
  })
})
