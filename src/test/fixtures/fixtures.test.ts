import { describe, expect, it } from "vitest"

import { markdownFixture, markdownFixtureNames } from "./index"

describe("markdown fixtures", () => {
  it("lists every fixture file", () => {
    expect(markdownFixtureNames()).toEqual(["basic", "empty"])
  })

  it("returns raw file contents", () => {
    const source = markdownFixture("basic")
    expect(source).toContain("# Heading one")
    expect(source).toContain("| Name | Value |")
    expect(source).toContain("[^1]: The footnote text.")
  })

  it("throws with the available names for an unknown fixture", () => {
    expect(() => markdownFixture("missing")).toThrow(
      'Unknown markdown fixture "missing". Available: basic, empty'
    )
  })
})
