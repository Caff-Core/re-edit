import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { defineMessages, useMessages } from "@/lib/i18n"

const messages = defineMessages({
  en: {
    window: "Window",
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",
  },
  "zh-CN": {
    window: "窗口",
    minimize: "最小化",
    maximize: "最大化",
    restore: "还原",
    close: "关闭",
  },
})

export interface WindowControlsProps {
  /** Shows the restore button in place of maximize. */
  maximized: boolean
  onMinimize: () => void
  onToggleMaximize: () => void
  onClose: () => void
}

/** Minimize, maximize or restore, and close, for a custom title bar. */
export function WindowControls({
  maximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlsProps) {
  const t = useMessages(messages)
  return (
    <div role="group" aria-label={t.window} className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.minimize}
        onClick={onMinimize}
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={maximized ? t.restore : t.maximize}
        onClick={onToggleMaximize}
      >
        {maximized ? (
          <CopyIcon aria-hidden="true" />
        ) : (
          <SquareIcon aria-hidden="true" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.close}
        onClick={onClose}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  )
}
