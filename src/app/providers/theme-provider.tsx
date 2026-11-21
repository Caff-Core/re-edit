import * as React from "react"

import {
  applyThemeClasses,
  isTheme,
  resolveTheme,
  type ConcreteTheme,
  type Theme,
} from "@/app/themes"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  /** The committed theme, the only one that is stored. */
  theme: Theme
  setTheme: (theme: Theme) => void
  /**
   * Shows a theme without committing it; null returns to the committed one.
   * Used while a theme list is open (REQ-007).
   */
  previewTheme: (theme: Theme | null) => void
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"

const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined)

function readStored(key: string): Theme | null {
  try {
    const stored = localStorage.getItem(key)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

function subscribeScheme(onChange: () => void) {
  const query = window.matchMedia(COLOR_SCHEME_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const systemDark = () => window.matchMedia(COLOR_SCHEME_QUERY).matches

/** Stops element transitions while theme colors swap, so nothing lags behind. */
function withoutTransitions(run: () => void) {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
    )
  )
  document.head.appendChild(style)
  run()
  window.getComputedStyle(document.body)
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()))
}

/**
 * Applies a theme. When motion is on and the engine supports view
 * transitions, the change cross-fades over the motion preset's duration.
 */
function showTheme(theme: ConcreteTheme, animate: boolean) {
  const root = document.documentElement
  const apply = () => withoutTransitions(() => applyThemeClasses(root, theme))
  const motion = root.dataset.motion
  if (
    animate &&
    motion !== undefined &&
    motion !== "none" &&
    typeof document.startViewTransition === "function"
  ) {
    document.startViewTransition(apply)
  } else {
    apply()
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(
    () => readStored(storageKey) ?? defaultTheme
  )
  const [preview, setPreview] = React.useState<Theme | null>(null)
  const dark = React.useSyncExternalStore(subscribeScheme, systemDark)
  const shown = resolveTheme(preview ?? theme, dark)
  const applied = React.useRef<ConcreteTheme | null>(null)

  React.useLayoutEffect(() => {
    if (applied.current === shown) return
    showTheme(shown, applied.current !== null)
    applied.current = shown
  }, [shown])

  const setTheme = React.useCallback(
    (next: Theme) => {
      try {
        localStorage.setItem(storageKey, next)
      } catch {
        // Storage can be unavailable; the theme still applies this session.
      }
      setThemeState(next)
      setPreview(null)
    },
    [storageKey]
  )

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== storageKey) return
      setThemeState(isTheme(event.newValue) ? event.newValue : defaultTheme)
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [defaultTheme, storageKey])

  const value = React.useMemo(
    () => ({ theme, setTheme, previewTheme: setPreview }),
    [theme, setTheme]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
