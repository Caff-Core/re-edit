import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { getEditorPreferences } from "../lib/preferences"
import { EditorPreferencesForm } from "./editor-preferences-form"

describe("editor font setting", () => {
  beforeEach(() => localStorage.clear())

  it("starts on Monospace and saves Sans", async () => {
    const user = userEvent.setup()
    render(<EditorPreferencesForm />)
    const group = screen.getByRole("group", { name: "Font" })
    const mono = screen.getByRole("button", { name: "Monospace" })
    const sans = screen.getByRole("button", { name: "Sans" })
    expect(group).toContainElement(mono)
    expect(mono).toHaveAttribute("aria-pressed", "true")

    await user.click(sans)
    expect(sans).toHaveAttribute("aria-pressed", "true")
    expect(mono).toHaveAttribute("aria-pressed", "false")
    expect(getEditorPreferences().fontFamily).toBe("sans")
  })
})
