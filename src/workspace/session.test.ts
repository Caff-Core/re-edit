import { describe, expect, it } from "vitest"

import { addRecent, MAX_RECENTS, parseRecents, parseSession } from "./session"

describe("session parsing", () => {
  it("drops malformed documents and fields", () => {
    const raw = JSON.stringify({
      documents: [
        {
          id: "doc-1",
          typeId: "markdown",
          title: "a.md",
          path: "/a.md",
          draft: null,
        },
        {
          id: "doc-2",
          typeId: "markdown",
          title: "Untitled",
          path: null,
          draft: "x",
        },
        { id: 3, typeId: "markdown" },
      ],
      activeId: "doc-2",
      folder: 42,
    })
    expect(parseSession(raw)).toEqual({
      documents: [
        {
          id: "doc-1",
          typeId: "markdown",
          title: "a.md",
          path: "/a.md",
          draft: null,
        },
        {
          id: "doc-2",
          typeId: "markdown",
          title: "Untitled",
          path: null,
          draft: "x",
        },
      ],
      activeId: "doc-2",
      folder: null,
    })
    expect(parseSession("not json")).toBeNull()
    expect(parseSession(null)).toBeNull()
  })

  it("keeps recents unique, newest first, and bounded", () => {
    let recents = parseRecents(
      JSON.stringify([{ path: "/a.md", kind: "file" }, { bad: 1 }])
    )
    expect(recents).toEqual([{ path: "/a.md", kind: "file" }])
    recents = addRecent(recents, { path: "/notes", kind: "folder" })
    recents = addRecent(recents, { path: "/a.md", kind: "file" })
    expect(recents.map((r) => r.path)).toEqual(["/a.md", "/notes"])
    for (let i = 0; i < 20; i++)
      recents = addRecent(recents, { path: `/${i}.md`, kind: "file" })
    expect(recents).toHaveLength(MAX_RECENTS)
    expect(recents[0].path).toBe("/19.md")
  })
})
