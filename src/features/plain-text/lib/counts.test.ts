import { describe, expect, it } from "vitest"

import { countText } from "./counts"

describe("AC-020: word and character counts", () => {
  it("counts words and characters, ignoring line breaks", () => {
    expect(countText("Hello, world.\nSecond line")).toEqual({
      words: 4,
      characters: 24,
    })
  })

  it("counts non-ASCII words and user-perceived characters", () => {
    // "naïve" and "café" are one word each; the flag emoji is one character.
    expect(countText("naïve café 🇨🇳")).toEqual({ words: 2, characters: 12 })
    expect(countText("").words).toBe(0)
  })

  it("splits Chinese into words instead of counting the run as one", () => {
    expect(countText("你好世界", "zh-CN").words).toBeGreaterThan(1)
    expect(countText("你好世界", "zh-CN").characters).toBe(4)
  })
})
