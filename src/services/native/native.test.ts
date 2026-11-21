import { beforeEach, describe, expect, it, vi } from "vitest"

const core = vi.hoisted(() => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false),
}))

vi.mock("@tauri-apps/api/core", () => core)

describe("native service", () => {
  beforeEach(() => {
    vi.resetModules()
    core.invoke.mockReset()
    core.isTauri.mockReturnValue(false)
  })

  it("uses the browser fallback outside Tauri", async () => {
    const { nativeService } = await import("./index")
    expect(nativeService.isDesktop).toBe(false)
    await expect(nativeService.appInfo()).resolves.toEqual({
      name: "re-edit",
      version: "dev",
      platform: "browser",
    })
    expect(core.invoke).not.toHaveBeenCalled()
  })

  it("calls the app_info command inside Tauri", async () => {
    core.isTauri.mockReturnValue(true)
    core.invoke.mockResolvedValue({
      name: "re-edit",
      version: "0.1.0",
      platform: "linux",
    })
    const { nativeService } = await import("./index")
    expect(nativeService.isDesktop).toBe(true)
    await expect(nativeService.appInfo()).resolves.toEqual({
      name: "re-edit",
      version: "0.1.0",
      platform: "linux",
    })
    expect(core.invoke).toHaveBeenCalledWith("app_info")
  })

  it("propagates host errors", async () => {
    core.isTauri.mockReturnValue(true)
    core.invoke.mockRejectedValue(new Error("host unavailable"))
    const { nativeService } = await import("./index")
    await expect(nativeService.appInfo()).rejects.toThrow("host unavailable")
  })
})

describe("native file errors", () => {
  beforeEach(() => {
    vi.resetModules()
    core.invoke.mockReset()
    core.isTauri.mockReturnValue(true)
  })

  it("turns Rust file errors into Error messages", async () => {
    core.invoke.mockRejectedValue({
      kind: "outsideScope",
      message: "/etc/passwd is outside",
    })
    const { nativeService } = await import("./index")
    await expect(nativeService.readTextFile("/etc/passwd")).rejects.toThrow(
      "/etc/passwd is outside"
    )
    expect(core.invoke).toHaveBeenCalledWith("read_text_file", {
      path: "/etc/passwd",
    })
  })

  it("passes camelCase arguments the Rust commands expect", async () => {
    core.invoke.mockResolvedValue(null)
    const { nativeService } = await import("./index")
    await nativeService.pickSavePath("Notes.md")
    expect(core.invoke).toHaveBeenCalledWith("pick_save_path", {
      suggestedName: "Notes.md",
    })
  })
})

describe("browser file fallback", () => {
  it("explains that files need the desktop app", async () => {
    vi.resetModules()
    core.isTauri.mockReturnValue(false)
    const { nativeService } = await import("./index")
    await expect(nativeService.pickFolder()).rejects.toThrow(
      "Files are available in the desktop app"
    )
  })
})
