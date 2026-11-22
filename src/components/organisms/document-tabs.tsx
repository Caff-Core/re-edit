import { XIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defineMessages, useMessages } from "@/lib/i18n"

const messages = defineMessages({
  en: {
    openDocuments: "Open documents",
    unsaved: (title: string) => `${title}, unsaved changes`,
    close: (title: string) => `Close ${title}`,
    closeTab: "Close",
    closeOthers: "Close others",
    closeLeft: "Close to the left",
    closeRight: "Close to the right",
    closeAll: "Close all",
  },
  "zh-CN": {
    openDocuments: "已打开的文档",
    unsaved: (title: string) => `${title}，有未保存的修改`,
    close: (title: string) => `关闭 ${title}`,
    closeTab: "关闭",
    closeOthers: "关闭其他",
    closeLeft: "关闭左侧",
    closeRight: "关闭右侧",
    closeAll: "全部关闭",
  },
})

export interface DocumentTab {
  id: string
  title: string
  dirty: boolean
}

/** Which tabs a close command takes, relative to the tab it was run on. */
export type CloseScope = "others" | "left" | "right" | "all"

/** The ids a close command removes, in tab order. */
export function tabsToClose(
  ids: readonly string[],
  id: string,
  scope: CloseScope
): string[] {
  const index = ids.indexOf(id)
  if (index === -1) return []
  switch (scope) {
    case "others":
      return ids.filter((other) => other !== id)
    case "left":
      return ids.slice(0, index)
    case "right":
      return ids.slice(index + 1)
    case "all":
      return [...ids]
  }
}

export interface DocumentTabsProps {
  tabs: DocumentTab[]
  onClose: (id: string) => void
  /** Closes several tabs from a tab's context menu, in tab order. */
  onCloseMany: (ids: string[]) => void
  /** Controls on the right of the strip, for example New and Save. */
  actions?: ReactNode
}

/**
 * Tab strip for open documents. Render inside a shadcn `Tabs` root whose
 * values are the tab ids. Close buttons sit beside each tab, not inside it,
 * so the tab itself stays a single control. Right-click a tab, or press the
 * Menu key or Shift+F10 on it, for the close commands.
 */
export function DocumentTabs({
  tabs,
  onClose,
  onCloseMany,
  actions,
}: DocumentTabsProps) {
  const t = useMessages(messages)
  const ids = tabs.map((tab) => tab.id)
  const scopes = [
    ["others", t.closeOthers],
    ["left", t.closeLeft],
    ["right", t.closeRight],
  ] as const

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
      <TabsList
        variant="line"
        aria-label={t.openDocuments}
        className="min-w-0 flex-1 justify-start overflow-x-auto"
      >
        {tabs.map((tab) => (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger className="flex shrink-0 items-center">
              <TabsTrigger
                value={tab.id}
                aria-label={tab.dirty ? t.unsaved(tab.title) : tab.title}
              >
                <span className="max-w-48 truncate">{tab.title}</span>
                {tab.dirty ? (
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-foreground"
                  />
                ) : null}
              </TabsTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.close(tab.title)}
                onClick={() => onClose(tab.id)}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuGroup>
                <ContextMenuItem onClick={() => onClose(tab.id)}>
                  {t.closeTab}
                </ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                {scopes.map(([scope, label]) => {
                  const targets = tabsToClose(ids, tab.id, scope)
                  return (
                    <ContextMenuItem
                      key={scope}
                      disabled={targets.length === 0}
                      onClick={() => onCloseMany(targets)}
                    >
                      {label}
                    </ContextMenuItem>
                  )
                })}
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuItem onClick={() => onCloseMany(ids)}>
                  {t.closeAll}
                </ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </TabsList>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </div>
  )
}
