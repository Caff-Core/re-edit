import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

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
  return (
    <div role="group" aria-label="Window" className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Minimize"
        onClick={onMinimize}
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={maximized ? "Restore" : "Maximize"}
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
        aria-label="Close"
        onClick={onClose}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  )
}
