/// <reference types="node" />
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { MOTION_PRESETS } from "@/app/providers/motion-provider"

// Read from disk: Vitest does not load stylesheet contents.
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8")

/** Bodies of every rule whose selector mentions the preset. */
function rules(preset: string) {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, selector]) => selector.includes(`data-motion="${preset}"`))
    .map(([, selector, body]) => ({ selector: selector.trim(), body }))
}

describe("AC-008: motion presets reach the installed surfaces", () => {
  it("defines a duration for every preset", () => {
    for (const preset of MOTION_PRESETS) {
      expect(
        rules(preset).some((r) => r.body.includes("--motion-duration:"))
      ).toBe(true)
    }
  })

  it("None stops every animation and transition, loops included", () => {
    const all = rules("none").find((r) => r.selector.includes("*"))
    expect(all?.body).toMatch(/animation-duration:\s*0\.01ms !important/)
    expect(all?.body).toMatch(/animation-iteration-count:\s*1 !important/)
    expect(all?.body).toMatch(/transition-duration:\s*0s !important/)
  })

  it("Subtle keeps the fade and drops zoom and slide", () => {
    const surface = rules("subtle").find((r) =>
      r.selector.includes("animate-in")
    )
    expect(surface?.body).toMatch(/--tw-enter-scale:\s*1 !important/)
    expect(surface?.body).toMatch(/--tw-enter-translate-y:\s*0 !important/)
    expect(surface?.body).not.toMatch(/--tw-duration/)
  })

  it("Bouncy uses the preset's easing and duration", () => {
    const surface = rules("bouncy").find((r) =>
      r.selector.includes("animate-in")
    )
    expect(surface?.body).toMatch(
      /--tw-ease:\s*var\(--motion-ease\) !important/
    )
    expect(surface?.body).toMatch(
      /--tw-duration:\s*var\(--motion-duration\) !important/
    )
  })

  it("Normal leaves the installed timing as shipped", () => {
    expect(
      rules("normal").every((r) => !r.selector.includes("animate-in"))
    ).toBe(true)
  })
})
