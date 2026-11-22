import { useSyncExternalStore } from "react"

export type EditorFontSize = "small" | "medium" | "large"
/** Prose font. Code always stays monospace. */
export type EditorFontFamily = "mono" | "sans"

export interface EditorPreferences {
  lineWrapping: boolean
  lineNumbers: boolean
  spellCheck: boolean
  fontSize: EditorFontSize
  fontFamily: EditorFontFamily
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  lineWrapping: true,
  lineNumbers: false,
  spellCheck: true,
  fontSize: "medium",
  fontFamily: "mono",
}

export const EDITOR_FONT_SIZES: Record<EditorFontSize, string> = {
  small: "0.8125rem",
  medium: "0.875rem",
  large: "1rem",
}

export const EDITOR_FONT_FAMILIES: Record<EditorFontFamily, string> = {
  mono: "var(--font-mono)",
  sans: "var(--font-sans)",
}

const STORAGE_KEY = "re-edit.editor-preferences"
const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cached: EditorPreferences = DEFAULT_EDITOR_PREFERENCES

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Parses stored preferences, keeping only valid fields over the defaults. */
export function parsePreferences(raw: string | null): EditorPreferences {
  if (!raw) return DEFAULT_EDITOR_PREFERENCES
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return DEFAULT_EDITOR_PREFERENCES
  }
  if (typeof value !== "object" || value === null)
    return DEFAULT_EDITOR_PREFERENCES
  const input = value as Record<string, unknown>
  const flag = (key: keyof EditorPreferences) =>
    typeof input[key] === "boolean" ? (input[key] as boolean) : undefined
  const fontSize =
    typeof input.fontSize === "string" && input.fontSize in EDITOR_FONT_SIZES
      ? (input.fontSize as EditorFontSize)
      : undefined
  const fontFamily =
    typeof input.fontFamily === "string" &&
    input.fontFamily in EDITOR_FONT_FAMILIES
      ? (input.fontFamily as EditorFontFamily)
      : undefined
  return {
    lineWrapping:
      flag("lineWrapping") ?? DEFAULT_EDITOR_PREFERENCES.lineWrapping,
    lineNumbers: flag("lineNumbers") ?? DEFAULT_EDITOR_PREFERENCES.lineNumbers,
    spellCheck: flag("spellCheck") ?? DEFAULT_EDITOR_PREFERENCES.spellCheck,
    fontSize: fontSize ?? DEFAULT_EDITOR_PREFERENCES.fontSize,
    fontFamily: fontFamily ?? DEFAULT_EDITOR_PREFERENCES.fontFamily,
  }
}

export function getEditorPreferences(): EditorPreferences {
  const raw = readRaw()
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cached = parsePreferences(raw)
  }
  return cached
}

export function setEditorPreferences(patch: Partial<EditorPreferences>) {
  const next = { ...getEditorPreferences(), ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: keep the change for this session only.
    cachedRaw = JSON.stringify(next)
    cached = next
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function useEditorPreferences(): EditorPreferences {
  return useSyncExternalStore(
    subscribe,
    getEditorPreferences,
    () => DEFAULT_EDITOR_PREFERENCES
  )
}
