import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

/**
 * Interface sizes as a percentage of the 16px root font. Every size in the
 * interface is in rem, so the root font scales the whole app together.
 */
export const INTERFACE_SIZES = [100, 112.5, 125, 150] as const
export type InterfaceSize = (typeof INTERFACE_SIZES)[number]
export const DEFAULT_INTERFACE_SIZE: InterfaceSize = 100
export const INTERFACE_SIZE_STORAGE_KEY = "interfaceSize"

export function isInterfaceSize(value: unknown): value is InterfaceSize {
  return INTERFACE_SIZES.includes(value as InterfaceSize)
}

interface InterfaceSizeState {
  size: InterfaceSize
  setSize: (size: InterfaceSize) => void
}

const InterfaceSizeContext = createContext<InterfaceSizeState>({
  size: DEFAULT_INTERFACE_SIZE,
  setSize: () => {},
})

function readStored(): InterfaceSize {
  try {
    const stored = Number(localStorage.getItem(INTERFACE_SIZE_STORAGE_KEY))
    return isInterfaceSize(stored) ? stored : DEFAULT_INTERFACE_SIZE
  } catch {
    return DEFAULT_INTERFACE_SIZE
  }
}

/** The next size up or down, staying within the list. */
export function stepInterfaceSize(size: InterfaceSize, step: 1 | -1) {
  const index = INTERFACE_SIZES.indexOf(size) + step
  return INTERFACE_SIZES[
    Math.min(INTERFACE_SIZES.length - 1, Math.max(0, index))
  ]
}

/**
 * Holds the interface size, applies it as the root font size, and handles
 * Ctrl+= and Ctrl+- (step) and Ctrl+0 (reset) anywhere in the window.
 */
export function InterfaceSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSizeState] = useState(readStored)

  useLayoutEffect(() => {
    document.documentElement.style.fontSize =
      size === DEFAULT_INTERFACE_SIZE ? "" : `${size}%`
  }, [size])

  const setSize = useCallback((next: InterfaceSize) => {
    try {
      localStorage.setItem(INTERFACE_SIZE_STORAGE_KEY, String(next))
    } catch {
      // Storage can be unavailable; the size still applies this session.
    }
    setSizeState(next)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      let next: InterfaceSize | null = null
      if (event.key === "=" || event.key === "+")
        next = stepInterfaceSize(size, 1)
      else if (event.key === "-" || event.key === "_")
        next = stepInterfaceSize(size, -1)
      else if (event.key === "0" && !event.shiftKey)
        next = DEFAULT_INTERFACE_SIZE
      if (next === null) return
      event.preventDefault()
      if (next !== size) setSize(next)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [size, setSize])

  const value = useMemo(() => ({ size, setSize }), [size, setSize])
  return (
    <InterfaceSizeContext.Provider value={value}>
      {children}
    </InterfaceSizeContext.Provider>
  )
}

export function useInterfaceSize() {
  return useContext(InterfaceSizeContext)
}
