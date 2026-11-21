import { RouterProvider, createMemoryHistory } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ThemeProvider } from "@/app/providers/theme-provider"
import { createAppRouter } from "@/app/router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LOCALE_STORAGE_KEY } from "@/lib/i18n"

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

describe("AC-009: English and Simplified Chinese interface", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = "en"
  })

  it("switches the whole interface from Settings and keeps the choice", async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp("/settings")
    await screen.findByRole("heading", { level: 1, name: "Settings" })

    const language = screen.getByRole("group", { name: "Language" })
    await user.click(within(language).getByRole("button", { name: "简体中文" }))

    expect(
      await screen.findByRole("heading", { level: 1, name: "设置" })
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe("zh-CN")
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("zh-CN")
    const nav = screen.getByRole("navigation", { name: "主导航" })
    expect(within(nav).getByRole("link", { name: "工作区" })).toBeVisible()
    expect(
      screen.getByRole("button", { name: "主题：跟随系统" })
    ).toBeInTheDocument()
    expect(screen.getByText("自动换行")).toBeInTheDocument()
    expect(
      screen.getByRole("contentinfo", { name: "状态" })
    ).toBeInTheDocument()

    unmount()
    renderApp("/")
    expect(
      await screen.findByRole("heading", { level: 1, name: "工作区" })
    ).toBeInTheDocument()
    expect(screen.getByText("没有打开的文档")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "新建 Markdown 文档" }))
    expect(
      await screen.findByRole("textbox", { name: "未命名，Markdown 源文本" })
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "未命名" })).toBeInTheDocument()
  })

  it("names languages in their own script in both languages", async () => {
    const user = userEvent.setup()
    renderApp("/settings")
    const language = await screen.findByRole("group", { name: "Language" })
    expect(
      within(language).getByRole("button", { name: "English" })
    ).toHaveAttribute("lang", "en")
    await user.click(within(language).getByRole("button", { name: "简体中文" }))
    const zh = await screen.findByRole("group", { name: "语言" })
    await user.click(within(zh).getByRole("button", { name: "English" }))
    expect(
      await screen.findByRole("heading", { level: 1, name: "Settings" })
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe("en")
  })
})
