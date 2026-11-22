import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FeatherIcon, WavesIcon } from "lucide-react"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { ChoiceGroup } from "./choice-group"

function Harness() {
  const [value, setValue] = useState<"a" | "b">("a")
  return (
    <>
      <span id="label">Motion</span>
      <ChoiceGroup
        labelledBy="label"
        value={value}
        onChange={setValue}
        options={[
          { value: "a", label: "Subtle", icon: FeatherIcon },
          { value: "b", label: "Normal", icon: WavesIcon, lang: "en" },
        ]}
      />
    </>
  )
}

describe("choice group", () => {
  it("is a named group of pressable buttons with one choice pressed", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const group = screen.getByRole("group", { name: "Motion" })
    const subtle = within(group).getByRole("button", { name: "Subtle" })
    const normal = within(group).getByRole("button", { name: "Normal" })
    expect(subtle).toHaveAttribute("aria-pressed", "true")
    expect(normal).toHaveAttribute("aria-pressed", "false")
    expect(normal).toHaveAttribute("lang", "en")
    // Icons are decorative; the visible text is the name.
    expect(group.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2)

    await user.tab()
    await user.tab()
    expect(normal).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(normal).toHaveAttribute("aria-pressed", "true")
    expect(subtle).toHaveAttribute("aria-pressed", "false")
  })
})
