import { useCallback, useSyncExternalStore } from "react"

/**
 * A boolean setting stored per device in localStorage. Every component
 * using it updates together; storage failures fall back to the default.
 */
export function createStoredBoolean(key: string, defaultValue: boolean) {
  const listeners = new Set<() => void>()

  const read = () => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? defaultValue : stored === "true"
    } catch {
      return defaultValue
    }
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return function useStoredBoolean(): [boolean, (value: boolean) => void] {
    const value = useSyncExternalStore(subscribe, read, () => defaultValue)
    const set = useCallback((next: boolean) => {
      try {
        localStorage.setItem(key, String(next))
      } catch {
        // Storage can be unavailable; nothing to persist then.
      }
      listeners.forEach((listener) => listener())
    }, [])
    return [value, set]
  }
}
