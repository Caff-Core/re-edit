import { useCallback, useSyncExternalStore } from "react"

/** Delay after the last edit before auto save writes a document. */
export const AUTO_SAVE_DELAY_MS = 1000
export const AUTO_SAVE_STORAGE_KEY = "autoSave"

const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(AUTO_SAVE_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The auto save setting (off by default), stored per device. */
export function useAutoSaveSetting(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false)
  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(AUTO_SAVE_STORAGE_KEY, String(next))
    } catch {
      // Storage can be unavailable; nothing to persist then.
    }
    listeners.forEach((listener) => listener())
  }, [])
  return [on, set]
}
