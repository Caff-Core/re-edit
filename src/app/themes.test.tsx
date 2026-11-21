import { RouterProvider, createMemoryHistory } from "@tanstack/react-router"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MOTION_STORAGE_KEY } from "@/app/providers/motion-provider"
import { ThemeProvider } from "@/app/providers/theme-provider"
import { createAppRouter } from "@/app/router"
import { TooltipProvider } from "@/components/ui/tooltip"

function renderSettings() {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: ["/settings"] })
  )
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  )
}

const html = document.documentElement

/** A matchMedia stand-in whose reduced-motion answer can change. */
function mockMedia(initialReduced: boolean) {
  let reduced = initialReduced
  const listeners = new Set<() => void>()
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return query.includes("reduced-motion") ? reduced : false
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, l: () => void) => listeners.add(l),
        removeEventListener: (_: string, l: () => void) => listeners.delete(l),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList
  )
  return (next: boolean) => {
    reduced = next
    listeners.forEach((l) => l())
  }
}

describe("AC-007: theme catalog and preview", () => {
  beforeEach(() => {
    localStorage.clear()
    html.className = ""
  })

  it("previews themes while highlighted and restores on dismissal", async () => {
    const user = userEvent.setup()
    renderSettings()
    await user.click(
      await screen.findByRole("button", { name: "Theme: System" })
    )
    const menu = await screen.findByRole("menu")
    const items = within(menu).getAllByRole("menuitemradio")
    expect(items.map((i) => i.textContent)).toEqual([
      "System",
      "Default Light",
      "Default Dark",
      "Solarized Light",
      "Solarized Dark",
    ])

    // Rapid previews: each highlight shows its theme right away.
    for (const [name, classes] of [
      ["Solarized Dark", ["dark", "theme-solarized-dark"]],
      ["Default Dark", ["dark"]],
      ["Solarized Light", ["light", "theme-solarized-light"]],
      ["Solarized Dark", ["dark", "theme-solarized-dark"]],
    ] as const) {
      act(() => within(menu).getByRole("menuitemradio", { name }).focus())
      expect([...html.classList].sort()).toEqual([...classes].sort())
    }

    await user.keyboard("{Escape}")
    expect([...html.classList]).toEqual(["light"])
    expect(localStorage.getItem("theme")).toBeNull()
    expect(
      screen.getByRole("button", { name: "Theme: System" })
    ).toBeInTheDocument()
  })

  it("commits a theme by keyboard and keeps only that across a restart", async () => {
    const user = userEvent.setup()
    const { unmount } = renderSettings()
    const trigger = await screen.findByRole("button", {
      name: "Theme: System",
    })
    act(() => trigger.focus())
    await user.keyboard("{Enter}")
    const menu = await screen.findByRole("menu")
    act(() =>
      within(menu).getByRole("menuitemradio", { name: "Default Dark" }).focus()
    )
    await user.keyboard("{ArrowDown}{ArrowDown}")
    expect(html).toHaveClass("theme-solarized-dark")
    await user.keyboard("{Enter}")

    expect(localStorage.getItem("theme")).toBe("solarized-dark")
    expect(html).toHaveClass("dark", "theme-solarized-dark")
    expect(
      await screen.findByRole("button", { name: "Theme: Solarized Dark" })
    ).toBeInTheDocument()

    unmount()
    html.className = ""
    renderSettings()
    await screen.findByRole("button", { name: "Theme: Solarized Dark" })
    expect([...html.classList].sort()).toEqual(
      ["dark", "theme-solarized-dark"].sort()
    )
  })
})

describe("AC-008: motion presets", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("applies each preset immediately and stores it", async () => {
    mockMedia(false)
    const user = userEvent.setup()
    renderSettings()
    const group = await screen.findByRole("group", { name: "Motion" })
    expect(html.dataset.motion).toBe("normal")
    for (const [name, value] of [
      ["None", "none"],
      ["Subtle", "subtle"],
      ["Bouncy", "bouncy"],
      ["Normal", "normal"],
    ] as const) {
      await user.click(within(group).getByRole("button", { name }))
      expect(html.dataset.motion).toBe(value)
      expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe(value)
    }
  })

  it("uses None while the system asks for reduced motion", async () => {
    const setReduced = mockMedia(true)
    localStorage.setItem(MOTION_STORAGE_KEY, "bouncy")
    renderSettings()
    expect(
      await screen.findByText(/Your system asks for reduced motion/)
    ).toBeInTheDocument()
    expect(html.dataset.motion).toBe("none")
    const group = screen.getByRole("group", { name: "Motion" })
    expect(
      within(group).getByRole("button", { name: "Bouncy" })
    ).toHaveAttribute("aria-pressed", "true")

    act(() => setReduced(false))
    expect(html.dataset.motion).toBe("bouncy")
    expect(screen.queryByText(/Your system asks for reduced motion/)).toBeNull()
  })
})
