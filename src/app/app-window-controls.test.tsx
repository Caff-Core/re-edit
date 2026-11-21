import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AppWindowControls } from "@/app/app-window-controls"
import type { AppWindow } from "@/services/native"

function fakeWindow() {
  let maximized = false
  const listeners = new Set<() => void>()
  const resize = () => listeners.forEach((listener) => listener())
  const appWindow: AppWindow = {
    minimize: vi.fn(async () => {}),
    toggleMaximize: vi.fn(async () => {
      maximized = !maximized
      resize()
    }),
    close: vi.fn(async () => {}),
    isMaximized: async () => maximized,
    onResized: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return { appWindow, listeners }
}

describe("title bar window controls", () => {
  it("renders nothing without a host window", () => {
    const { container } = render(<AppWindowControls appWindow={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("minimizes, maximizes and restores, and closes the window", async () => {
    const user = userEvent.setup()
    const { appWindow } = fakeWindow()
    render(<AppWindowControls appWindow={appWindow} />)

    const group = screen.getByRole("group", { name: "Window" })
    expect(group).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Minimize" }))
    expect(appWindow.minimize).toHaveBeenCalledOnce()

    await user.click(screen.getByRole("button", { name: "Maximize" }))
    expect(appWindow.toggleMaximize).toHaveBeenCalledOnce()
    await user.click(await screen.findByRole("button", { name: "Restore" }))
    expect(
      await screen.findByRole("button", { name: "Maximize" })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close" }))
    expect(appWindow.close).toHaveBeenCalledOnce()
  })

  it("stops listening for resizes on unmount", () => {
    const { appWindow, listeners } = fakeWindow()
    const { unmount } = render(<AppWindowControls appWindow={appWindow} />)
    expect(listeners.size).toBe(1)
    unmount()
    expect(listeners.size).toBe(0)
  })
})
