import { defineMessages } from "@/lib/i18n"

/** App-level strings: navigation, settings, status, and not found. */
export const appMessages = defineMessages({
  en: {
    brandDescription: "Markdown editor",
    workspace: "Workspace",
    settings: "Settings",
    notFoundTitle: "Not found",
    pageNotFound: "Page not found",
    pageNotFoundHelp:
      "This view does not exist. Go back to the workspace to keep writing.",
    backToWorkspace: "Back to workspace",
    loadingVersion: "Loading version",
    versionUnavailable: "Version unavailable.",
    retry: "Retry",
    appearance: "Appearance",
    appearanceHelp: "System follows your desktop setting.",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "Language",
    languageHelp: "System follows your desktop language.",
    languageSystem: "System",
    editor: "Editor",
    editorHelp: "Changes apply to open documents right away.",
  },
  "zh-CN": {
    brandDescription: "Markdown 编辑器",
    workspace: "工作区",
    settings: "设置",
    notFoundTitle: "未找到",
    pageNotFound: "找不到页面",
    pageNotFoundHelp: "此视图不存在。返回工作区继续写作。",
    backToWorkspace: "返回工作区",
    loadingVersion: "正在加载版本",
    versionUnavailable: "版本信息不可用。",
    retry: "重试",
    appearance: "外观",
    appearanceHelp: "“跟随系统”使用桌面的设置。",
    theme: "主题",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    language: "语言",
    languageHelp: "“跟随系统”使用桌面的语言。",
    languageSystem: "跟随系统",
    editor: "编辑器",
    editorHelp: "更改会立即应用到已打开的文档。",
  },
})

/** Language names, written in their own language so anyone can find theirs. */
export const LANGUAGE_NAMES = { en: "English", "zh-CN": "简体中文" } as const
