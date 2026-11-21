import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { nativeService, type AppInfo } from "@/services/native"

type AppInfoState =
  | { status: "loading" }
  | { status: "ready"; info: AppInfo }
  | { status: "error" }

/** Status bar content: application version and host platform. */
export function AppStatus() {
  const [state, setState] = useState<AppInfoState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    nativeService.appInfo().then(
      (info) => {
        if (!cancelled) setState({ status: "ready", info })
      },
      () => {
        if (!cancelled) setState({ status: "error" })
      }
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: "loading" })
    setAttempt((value) => value + 1)
  }, [])

  if (state.status === "loading") {
    return (
      <Skeleton className="h-3 w-28" aria-label="Loading version" role="status" />
    )
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="flex items-center gap-2">
        <span>Version unavailable.</span>
        <Button type="button" variant="ghost" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <span>
      {state.info.name} {state.info.version} · {state.info.platform}
    </span>
  )
}
