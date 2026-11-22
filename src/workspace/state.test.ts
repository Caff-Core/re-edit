import { describe, expect, it } from "vitest"

import {
  initialWorkspaceState,
  nextTitle,
  workspaceReducer,
  type WorkspaceState,
} from "./state"
import type { OpenDocument } from "./types"

const doc = (id: string, title = id): OpenDocument => ({
  id,
  typeId: "markdown",
  title,
  path: null,
  initialContent: "",
  savedContent: "",
  dirty: false,
  modifiedMs: null,
})

function open(...ids: string[]): WorkspaceState {
  return ids.reduce(
    (state, id) => workspaceReducer(state, { type: "open", document: doc(id) }),
    initialWorkspaceState
  )
}

describe("workspace state", () => {
  it("opens documents in order and activates the newest", () => {
    const state = open("a", "b")
    expect(state.documents.map((d) => d.id)).toEqual(["a", "b"])
    expect(state.activeId).toBe("b")
  })

  it("activates the right neighbor, then the left, when closing the active tab", () => {
    let state = workspaceReducer(open("a", "b", "c"), {
      type: "activate",
      id: "b",
    })
    state = workspaceReducer(state, { type: "close", id: "b" })
    expect(state.activeId).toBe("c")
    state = workspaceReducer(state, { type: "close", id: "c" })
    expect(state.activeId).toBe("a")
    state = workspaceReducer(state, { type: "close", id: "a" })
    expect(state).toEqual({ documents: [], activeId: null })
  })

  it("keeps the active tab when closing another", () => {
    const state = workspaceReducer(open("a", "b"), { type: "close", id: "a" })
    expect(state.activeId).toBe("b")
  })

  it("closes several tabs at once and keeps an untouched active tab", () => {
    const state = workspaceReducer(open("a", "b", "c", "d"), {
      type: "closeMany",
      ids: ["a", "b"],
    })
    expect(state.documents.map((d) => d.id)).toEqual(["c", "d"])
    expect(state.activeId).toBe("d")
  })

  it("moves the active tab to the nearest survivor, right first", () => {
    const base = workspaceReducer(open("a", "b", "c", "d"), {
      type: "activate",
      id: "b",
    })
    // Close to the left of c, with b active: c takes over.
    expect(
      workspaceReducer(base, { type: "closeMany", ids: ["a", "b"] }).activeId
    ).toBe("c")
    // Close to the right of a, with b active: a takes over.
    expect(
      workspaceReducer(base, { type: "closeMany", ids: ["b", "c", "d"] })
        .activeId
    ).toBe("a")
    // Close all.
    expect(
      workspaceReducer(base, { type: "closeMany", ids: ["a", "b", "c", "d"] })
    ).toEqual({ documents: [], activeId: null })
  })

  it("returns the same state when nothing matches", () => {
    const state = open("a")
    expect(workspaceReducer(state, { type: "closeMany", ids: ["x"] })).toBe(
      state
    )
  })

  it("tracks dirty flags and ignores no-op updates", () => {
    const opened = open("a")
    const dirty = workspaceReducer(opened, {
      type: "dirty",
      id: "a",
      dirty: true,
    })
    expect(dirty.documents[0].dirty).toBe(true)
    expect(
      workspaceReducer(dirty, { type: "dirty", id: "a", dirty: true })
    ).toBe(dirty)
  })

  it("renames a document after Save As", () => {
    const state = workspaceReducer(open("a"), {
      type: "rename",
      id: "a",
      path: "/n/a.md",
      title: "a.md",
    })
    expect(state.documents[0]).toMatchObject({ path: "/n/a.md", title: "a.md" })
  })

  it("numbers repeated titles", () => {
    expect(nextTitle("Untitled", [])).toBe("Untitled")
    expect(
      nextTitle("Untitled", [doc("a", "Untitled"), doc("b", "Untitled 2")])
    ).toBe("Untitled 3")
  })
})
