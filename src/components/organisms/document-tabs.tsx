import { XIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defineMessages, useMessages } from "@/lib/i18n"

const messages = defineMessages({
  en: {
    openDocuments: "Open documents",
    unsaved: (title: string) => `${title}, unsaved changes`,
    close: (title: string) => `Close ${title}`,
  },
  "zh-CN": {
    openDocuments: "已打开的文档",
    unsaved: (title: string) => `${title}，有未保存的修改`,
    close: (title: string) => `关闭 ${title}`,
  },
})

export interface DocumentTab {
  id: string
  title: string
  dirty: boolean
}

export interface DocumentTabsProps {
  tabs: DocumentTab[]
  onClose: (id: string) => void
  /** Controls on the right of the strip, for example New and Save. */
  actions?: ReactNode
}

/**
 * Tab strip for open documents. Render inside a shadcn `Tabs` root whose
 * values are the tab ids. Close buttons sit beside each tab, not inside it,
 * so the tab itself stays a single control.
 */
export function DocumentTabs({ tabs, onClose, actions }: DocumentTabsProps) {
  const t = useMessages(messages)
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
      <TabsList
        variant="line"
        aria-label={t.openDocuments}
        className="min-w-0 flex-1 justify-start overflow-x-auto"
      >
        {tabs.map((tab) => (
          <div key={tab.id} className="flex shrink-0 items-center">
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
          </div>
        ))}
      </TabsList>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </div>
  )
}
