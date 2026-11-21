import { createFileRoute } from "@tanstack/react-router"
import { LanguagesIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { LANGUAGE_NAMES, appMessages } from "@/app/messages"
import { useTheme } from "@/app/providers/theme-provider"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { EditorPreferencesForm } from "@/features/markdown"
import { LOCALES, isLocalePreference, useLocale, useMessages } from "@/lib/i18n"

export const Route = createFileRoute("/settings")({
  staticData: {
    title: {
      en: appMessages.en.settings,
      "zh-CN": appMessages["zh-CN"].settings,
    },
  },
  component: Settings,
})

const THEMES = [
  { value: "system", label: "themeSystem", icon: MonitorIcon },
  { value: "light", label: "themeLight", icon: SunIcon },
  { value: "dark", label: "themeDark", icon: MoonIcon },
] as const

type ThemeValue = (typeof THEMES)[number]["value"]

function isThemeValue(value: string | undefined): value is ThemeValue {
  return THEMES.some((theme) => theme.value === value)
}

function Settings() {
  const t = useMessages(appMessages)
  const { theme, setTheme } = useTheme()
  const { preference, setPreference } = useLocale()

  return (
    <div className="flex max-w-2xl min-w-0 flex-col gap-6 p-6">
      <section
        aria-labelledby="appearance-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <h2 id="appearance-heading" className="text-sm font-medium">
            {t.appearance}
          </h2>
          <p className="text-sm text-muted-foreground">{t.appearanceHelp}</p>
        </div>
        <ToggleGroup
          aria-label={t.theme}
          variant="outline"
          size="sm"
          value={[theme]}
          onValueChange={(next) => {
            const [value] = next
            if (isThemeValue(value)) setTheme(value)
          }}
        >
          {THEMES.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              <option.icon aria-hidden="true" />
              {t[option.label]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>
      <Separator />
      <section
        aria-labelledby="language-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <h2 id="language-heading" className="text-sm font-medium">
            {t.language}
          </h2>
          <p className="text-sm text-muted-foreground">{t.languageHelp}</p>
        </div>
        <ToggleGroup
          aria-label={t.language}
          variant="outline"
          size="sm"
          value={[preference]}
          onValueChange={(next) => {
            const [value] = next
            if (isLocalePreference(value)) setPreference(value)
          }}
        >
          <ToggleGroupItem value="system">
            <LanguagesIcon aria-hidden="true" />
            {t.languageSystem}
          </ToggleGroupItem>
          {LOCALES.map((locale) => (
            <ToggleGroupItem key={locale} value={locale} lang={locale}>
              {LANGUAGE_NAMES[locale]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>
      <Separator />
      <section aria-labelledby="editor-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="editor-heading" className="text-sm font-medium">
            {t.editor}
          </h2>
          <p className="text-sm text-muted-foreground">{t.editorHelp}</p>
        </div>
        <EditorPreferencesForm />
      </section>
    </div>
  )
}
