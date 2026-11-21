import { RouterProvider, createMemoryHistory } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/app/providers/theme-provider"
import { createAppRouter } from "@/app/router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { nativeService } from "@/services/native"

function renderApp(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] })
  )
  render(
    <ThemeProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  )
  return router
}

async function pageTitle(name: string) {
  return screen.findByRole("heading", { level: 1, name })
}

describe("app shell routes", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ""
  })

  it("renders the workspace inside the shell", async () => {
    renderApp("/")
    await pageTitle("Workspace")
    expect(screen.getByText("No document open")).toBeInTheDocument()

    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(
      within(nav).getByRole("link", { name: "Workspace" })
    ).toBeInTheDocument()
    expect(
      within(nav).getByRole("link", { name: "Settings" })
    ).toBeInTheDocument()

    const status = screen.getByRole("contentinfo", { name: "Status" })
    expect(
      await within(status).findByText("re-edit dev · browser")
    ).toBeInTheDocument()
  })

  it("keeps open documents when visiting settings and coming back", async () => {
    const user = userEvent.setup()
    renderApp("/")
    await user.click(
      await screen.findByRole("button", { name: "New Markdown document" })
    )
    const editor = await screen.findByRole("textbox", {
      name: "Untitled, Markdown source",
    })
    const nav = screen.getByRole("navigation", { name: "Primary" })
    await user.click(within(nav).getByRole("link", { name: "Settings" }))
    await pageTitle("Settings")
    await user.click(within(nav).getByRole("link", { name: "Workspace" }))
    await pageTitle("Workspace")
    expect(
      screen.getByRole("textbox", { name: "Untitled, Markdown source" })
    ).toBe(editor)
  })

  it("navigates to settings from the sidebar", async () => {
    const user = userEvent.setup()
    const router = renderApp("/")
    const nav = await screen.findByRole("navigation", { name: "Primary" })
    await user.click(within(nav).getByRole("link", { name: "Settings" }))
    await pageTitle("Settings")
    expect(router.state.location.pathname).toBe("/settings")
  })

  it("shows the not-found view for an unknown route, inside the shell", async () => {
    const user = userEvent.setup()
    const router = renderApp("/does-not-exist")
    await pageTitle("Not found")
    expect(screen.getByText("Page not found")).toBeInTheDocument()
    expect(
      screen.getByRole("navigation", { name: "Primary" })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: "Back to workspace" }))
    await pageTitle("Workspace")
    expect(router.state.location.pathname).toBe("/")
  })

  it("keeps Ctrl+B in the editor for bold instead of toggling the sidebar", async () => {
    const user = userEvent.setup()
    renderApp("/")
    await user.click(
      await screen.findByRole("button", { name: "New Markdown document" })
    )
    const editor = await screen.findByRole("textbox", {
      name: "Untitled, Markdown source",
    })
    const sidebarState = () =>
      document
        .querySelector('[data-slot="sidebar"]')
        ?.getAttribute("data-state")
    expect(sidebarState()).toBe("expanded")

    editor.focus()
    await user.keyboard("{Control>}b{/Control}")
    expect(sidebarState()).toBe("expanded")
    expect(editor.textContent).toContain("****")

    // Control case: outside the editor the shortcut still toggles the sidebar.
    editor.blur()
    await user.keyboard("{Control>}b{/Control}")
    expect(sidebarState()).toBe("collapsed")
  })

  it("shows an inline error with Retry when the host cannot report its version", async () => {
    const user = userEvent.setup()
    const appInfo = vi
      .spyOn(nativeService, "appInfo")
      .mockRejectedValueOnce(new Error("host unavailable"))
    renderApp("/")
    await pageTitle("Workspace")

    const status = screen.getByRole("contentinfo", { name: "Status" })
    expect(
      await within(status).findByText("Version unavailable.")
    ).toBeInTheDocument()

    await user.click(within(status).getByRole("button", { name: "Retry" }))
    expect(
      await within(status).findByText("re-edit dev · browser")
    ).toBeInTheDocument()
    expect(appInfo).toHaveBeenCalledTimes(2)
  })
})
