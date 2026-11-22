import { beforeEach, describe, expect, it } from "vitest"

import {
  DEFAULT_EDITOR_PREFERENCES,
  getEditorPreferences,
  parsePreferences,
  setEditorPreferences,
} from "./preferences"

describe("editor preferences", () => {
  beforeEach(() => localStorage.clear())

  it("falls back to defaults for missing or invalid data", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES)
    expect(parsePreferences("not json")).toEqual(DEFAULT_EDITOR_PREFERENCES)
    expect(parsePreferences("[1,2]")).toEqual(DEFAULT_EDITOR_PREFERENCES)
  })

  it("keeps valid fields and drops invalid ones", () => {
    expect(
      parsePreferences(
        JSON.stringify({
          lineNumbers: true,
          fontSize: "huge",
          spellCheck: "no",
          fontFamily: "comic",
        })
      )
    ).toEqual({ ...DEFAULT_EDITOR_PREFERENCES, lineNumbers: true })
  })

  it("defaults the prose font to monospace and keeps a valid choice", () => {
    expect(DEFAULT_EDITOR_PREFERENCES.fontFamily).toBe("mono")
    expect(
      parsePreferences(JSON.stringify({ fontFamily: "sans" })).fontFamily
    ).toBe("sans")
  })

  it("persists changes and returns a stable snapshot", () => {
    setEditorPreferences({ fontSize: "large" })
    const first = getEditorPreferences()
    expect(first.fontSize).toBe("large")
    expect(getEditorPreferences()).toBe(first)
    expect(
      JSON.parse(localStorage.getItem("re-edit.editor-preferences")!)
    ).toMatchObject({
      fontSize: "large",
    })
  })
})
