import { describe, expect, it } from "vitest"

const TIERS = ["atoms", "molecules", "organisms", "templates"]
const VENDOR = ["ui", "reui"]

const componentFiles = Object.keys(
  import.meta.glob("/src/components/**/*.{ts,tsx,md}")
).filter((path) => path !== "/src/components/structure.test.ts")

const featureFiles = Object.keys(import.meta.glob("/src/features/**/*"))

describe("component layout", () => {
  it("keeps every shared component inside a tier or a vendor folder", () => {
    const allowed = [...TIERS, ...VENDOR]
    const stray = componentFiles.filter((path) => {
      const folder = path.split("/")[3]
      return !allowed.includes(folder) || path.split("/").length < 5
    })
    expect(stray).toEqual([])
  })

  it("documents each tier", () => {
    for (const tier of TIERS) {
      expect(componentFiles).toContain(`/src/components/${tier}/README.md`)
    }
  })
})

describe("feature layout", () => {
  it("gives every feature an index.ts public API", () => {
    const features = new Set(
      featureFiles
        .map((path) => path.split("/"))
        .filter((parts) => parts.length > 4)
        .map((parts) => parts[3])
    )
    const missing = [...features].filter(
      (name) => !featureFiles.includes(`/src/features/${name}/index.ts`)
    )
    expect(missing).toEqual([])
  })
})
