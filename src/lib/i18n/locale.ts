/** Interface languages the app ships. */
export const LOCALES = ["en", "zh-CN"] as const
export type Locale = (typeof LOCALES)[number]

/** What the user picked; "system" follows the desktop language. */
export type LocalePreference = "system" | Locale

export const LOCALE_PREFERENCES: readonly LocalePreference[] = [
  "system",
  ...LOCALES,
]

export function isLocalePreference(value: unknown): value is LocalePreference {
  return LOCALE_PREFERENCES.includes(value as LocalePreference)
}

/** Traditional Chinese tags, which the Simplified catalog does not serve. */
const TRADITIONAL = /^zh-(hant|tw|hk|mo)\b/

/**
 * The first supported language in the desktop's list, else English.
 * Simplified Chinese matches zh, zh-CN, zh-SG, and zh-Hans tags.
 */
export function resolveLocale(
  preference: LocalePreference,
  languages: readonly string[]
): Locale {
  if (preference !== "system") return preference
  for (const tag of languages) {
    const lower = tag.toLowerCase().replace(/_/g, "-")
    if (lower === "en" || lower.startsWith("en-")) return "en"
    if ((lower === "zh" || lower.startsWith("zh-")) && !TRADITIONAL.test(lower))
      return "zh-CN"
  }
  return "en"
}
