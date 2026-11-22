import { RouterProvider, createMemoryHistory } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import {
  INTERFACE_SIZE_STORAGE_KEY,
  stepInterfaceSize,
} from "@/app/providers/interface-size-provider"
import { ThemeProvider } from "@/app/providers/theme-provider"
import { createAppRouter } from "@/app/router"
import { TooltipProvider } from "@/components/ui/tooltip"

function renderApp(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] })
  )
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  )
}

const rootSize = () => document.documentElement.style.fontSize

describe("000.09: interface size", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.fontSize = ""
  })

  it("scales the root font from Settings and keeps the choice", async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp("/settings")
    const group = await screen.findByRole("group", { name: "Interface size" })
    expect(within(group).getByRole("button", { name: "100%" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    await user.click(within(group).getByRole("button", { name: "125%" }))
    expect(rootSize()).toBe("125%")
    expect(localStorage.getItem(INTERFACE_SIZE_STORAGE_KEY)).toBe("125")

    unmount()
    document.documentElement.style.fontSize = ""
    renderApp("/settings")
    await screen.findByRole("group", { name: "Interface size" })
    expect(rootSize()).toBe("125%")
  })

  it("steps with Ctrl+= and Ctrl+- and resets with Ctrl+0", async () => {
    const user = userEvent.setup()
    renderApp("/")
    await screen.findByRole("heading", { level: 1, name: "Workspace" })
    await user.keyboard("{Control>}={/Control}")
    expect(rootSize()).toBe("112.5%")
    await user.keyboard(
      "{Control>}={/Control}{Control>}={/Control}{Control>}={/Control}"
    )
    expect(rootSize()).toBe("150%")
    await user.keyboard("{Control>}-{/Control}")
    expect(rootSize()).toBe("125%")
    await user.keyboard("{Control>}0{/Control}")
    expect(rootSize()).toBe("")
    expect(localStorage.getItem(INTERFACE_SIZE_STORAGE_KEY)).toBe("100")
  })

  it("stays within the list of sizes", () => {
    expect(stepInterfaceSize(150, 1)).toBe(150)
    expect(stepInterfaceSize(100, -1)).toBe(100)
    expect(stepInterfaceSize(112.5, 1)).toBe(125)
  })
})
