import { describe, expect, it } from "vitest"

import { isLocalePreference, resolveLocale } from "./locale"

describe("interface language", () => {
  it("uses an explicit choice over the desktop language", () => {
    expect(resolveLocale("zh-CN", ["en-US"])).toBe("zh-CN")
    expect(resolveLocale("en", ["zh-CN"])).toBe("en")
  })

  it("follows the first supported desktop language", () => {
    expect(resolveLocale("system", ["zh-CN", "en-US"])).toBe("zh-CN")
    expect(resolveLocale("system", ["zh_SG"])).toBe("zh-CN")
    expect(resolveLocale("system", ["zh-Hans-CN"])).toBe("zh-CN")
    expect(resolveLocale("system", ["de-DE", "en-GB", "zh-CN"])).toBe("en")
  })

  it("falls back to English for Traditional Chinese and unknown languages", () => {
    expect(resolveLocale("system", ["zh-TW"])).toBe("en")
    expect(resolveLocale("system", ["zh-Hant-HK"])).toBe("en")
    expect(resolveLocale("system", ["fr-FR"])).toBe("en")
    expect(resolveLocale("system", [])).toBe("en")
  })

  it("accepts only known preferences", () => {
    expect(isLocalePreference("system")).toBe(true)
    expect(isLocalePreference("zh-CN")).toBe(true)
    expect(isLocalePreference("zh")).toBe(false)
    expect(isLocalePreference(null)).toBe(false)
  })
})
