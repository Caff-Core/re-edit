import { expect, it } from "vitest"

// Temporary: proves CI fails on a failing test (issue #5). Reverted in the next commit.
it("fails on purpose", () => {
  expect(1).toBe(2)
})
