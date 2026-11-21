import { useEffect, useState } from "react"

import { WindowControls } from "@/components/molecules/window-controls"
import type { AppWindow } from "@/services/native"

export interface AppWindowControlsProps {
  /** The window to control; null renders nothing (plain browser). */
  appWindow: AppWindow | null
}

/** Title bar buttons wired to the host window. */
export function AppWindowControls({ appWindow }: AppWindowControlsProps) {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!appWindow) return
    let live = true
    const sync = () => {
      appWindow.isMaximized().then(
        (value) => {
          if (live) setMaximized(value)
        },
        () => {}
      )
    }
    sync()
    const stop = appWindow.onResized(sync)
    return () => {
      live = false
      stop()
    }
  }, [appWindow])

  if (!appWindow) return null

  return (
    <WindowControls
      maximized={maximized}
      onMinimize={() => void appWindow.minimize()}
      onToggleMaximize={() => void appWindow.toggleMaximize()}
      onClose={() => void appWindow.close()}
    />
  )
}
