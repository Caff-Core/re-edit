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
  initialContent: "",
  dirty: false,
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

  it("numbers repeated titles", () => {
    expect(nextTitle("Untitled", [])).toBe("Untitled")
    expect(
      nextTitle("Untitled", [doc("a", "Untitled"), doc("b", "Untitled 2")])
    ).toBe("Untitled 3")
  })
})
