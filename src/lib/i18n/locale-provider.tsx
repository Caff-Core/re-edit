import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import {
  isLocalePreference,
  resolveLocale,
  type Locale,
  type LocalePreference,
} from "./locale"
import type { Catalog } from "./messages"

export const LOCALE_STORAGE_KEY = "locale"

interface LocaleState {
  preference: LocalePreference
  locale: Locale
  setPreference: (preference: LocalePreference) => void
}

const fallback: LocaleState = {
  preference: "system",
  locale: "en",
  setPreference: () => {},
}

const LocaleContext = createContext<LocaleState>(fallback)

function readPreference(): LocalePreference {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocalePreference(stored) ? stored : "system"
  } catch {
    return "system"
  }
}

function subscribeLanguages(onChange: () => void) {
  window.addEventListener("languagechange", onChange)
  return () => window.removeEventListener("languagechange", onChange)
}

const languagesKey = () => navigator.languages.join(",")

/**
 * Holds the interface language. The choice is stored per device; "system"
 * follows the desktop language and updates when it changes.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readPreference)
  const languages = useSyncExternalStore(subscribeLanguages, languagesKey)
  const locale = resolveLocale(preference, languages.split(","))

  const setPreference = useCallback((next: LocalePreference) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable; the choice still applies this session.
    }
    setPreferenceState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo(
    () => ({ preference, locale, setPreference }),
    [preference, locale, setPreference]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

/** The current language and the user's preference. */
export function useLocale() {
  return useContext(LocaleContext)
}

/** A module's strings in the current language. */
export function useMessages<M>(catalog: Catalog<M>): M {
  return catalog[useLocale().locale]
}
