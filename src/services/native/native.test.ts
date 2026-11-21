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
