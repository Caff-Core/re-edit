import { createFileRoute } from "@tanstack/react-router"
import { ChevronDownIcon, LanguagesIcon } from "lucide-react"

import { LANGUAGE_NAMES, appMessages } from "@/app/messages"
import {
  INTERFACE_SIZES,
  isInterfaceSize,
  useInterfaceSize,
} from "@/app/providers/interface-size-provider"
import {
  MOTION_PRESETS,
  isMotionPreset,
  useMotion,
} from "@/app/providers/motion-provider"
import { useTheme } from "@/app/providers/theme-provider"
import { THEMES, isTheme, type Theme } from "@/app/themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { EditorPreferencesForm } from "@/features/markdown"
import { LOCALES, isLocalePreference, useLocale, useMessages } from "@/lib/i18n"
import { useAutoSaveSetting, useTreeLinesSetting } from "@/workspace"

export const Route = createFileRoute("/settings")({
  staticData: {
    title: {
      en: appMessages.en.settings,
      "zh-CN": appMessages["zh-CN"].settings,
    },
  },
  component: Settings,
})

type AppMessages = (typeof appMessages)["en"]

const THEME_LABELS: Record<Theme, keyof AppMessages> = {
  system: "themeSystem",
  light: "themeLight",
  dark: "themeDark",
  "solarized-light": "themeSolarizedLight",
  "solarized-dark": "themeSolarizedDark",
  dracula: "themeDracula",
  nord: "themeNord",
  "gruvbox-light": "themeGruvboxLight",
  "gruvbox-dark": "themeGruvboxDark",
  "catppuccin-latte": "themeCatppuccinLatte",
  "catppuccin-mocha": "themeCatppuccinMocha",
  neon: "themeNeon",
}

const MOTION_LABELS = {
  none: "motionNone",
  subtle: "motionSubtle",
  normal: "motionNormal",
  bouncy: "motionBouncy",
} as const

/**
 * Theme list with preview (REQ-007): highlighting an item by pointer or
 * arrow keys shows it, choosing one commits it, and closing the list
 * without choosing restores the committed theme.
 */
function ThemeMenu() {
  const t = useMessages(appMessages)
  const { theme, setTheme, previewTheme } = useTheme()
  const label = (value: Theme) => t[THEME_LABELS[value]] as string

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) previewTheme(null)
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            aria-label={t.themeButton(label(theme))}
          />
        }
      >
        {label(theme)}
        <ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (isTheme(value)) setTheme(value)
          }}
        >
          {THEMES.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              closeOnClick
              onFocus={() => previewTheme(value)}
            >
              {label(value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Settings() {
  const t = useMessages(appMessages)
  const { preference, setPreference } = useLocale()
  const { motion, reducedMotion, setMotion } = useMotion()
  const { size, setSize } = useInterfaceSize()
  const [autoSave, setAutoSave] = useAutoSaveSetting()
  const [treeLines, setTreeLines] = useTreeLinesSetting()

  return (
    <div className="flex max-w-2xl min-w-0 flex-col gap-6 p-6">
      <section
        aria-labelledby="appearance-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="appearance-heading" className="text-sm font-medium">
            {t.appearance}
          </h2>
          <p className="text-sm text-muted-foreground">{t.appearanceHelp}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">{t.theme}</span>
          <ThemeMenu />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span id="size-label" className="text-sm font-medium">
              {t.interfaceSize}
            </span>
            <p className="text-xs text-muted-foreground">
              {t.interfaceSizeHelp}
            </p>
          </div>
          <ToggleGroup
            aria-labelledby="size-label"
            variant="outline"
            size="sm"
            value={[String(size)]}
            onValueChange={(next) => {
              const value = Number(next[0])
              if (isInterfaceSize(value)) setSize(value)
            }}
          >
            {INTERFACE_SIZES.map((value) => (
              <ToggleGroupItem key={value} value={String(value)}>
                {`${value}%`}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor="tree-lines" className="text-sm">
              {t.treeLines}
            </Label>
            <p
              id="tree-lines-description"
              className="text-xs text-muted-foreground"
            >
              {t.treeLinesHelp}
            </p>
          </div>
          <Switch
            id="tree-lines"
            aria-describedby="tree-lines-description"
            checked={treeLines}
            onCheckedChange={setTreeLines}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span id="motion-label" className="text-sm font-medium">
                {t.motion}
              </span>
              <p className="text-xs text-muted-foreground">{t.motionHelp}</p>
            </div>
            <ToggleGroup
              aria-labelledby="motion-label"
              variant="outline"
              size="sm"
              value={[motion]}
              onValueChange={(next) => {
                const [value] = next
                if (isMotionPreset(value)) setMotion(value)
              }}
            >
              {MOTION_PRESETS.map((value) => (
                <ToggleGroupItem key={value} value={value}>
                  {t[MOTION_LABELS[value]]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {reducedMotion ? (
            <p role="status" className="text-xs text-muted-foreground">
              {t.motionReduced}
            </p>
          ) : null}
        </div>
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
      <section aria-labelledby="files-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="files-heading" className="text-sm font-medium">
            {t.files}
          </h2>
          <p className="text-sm text-muted-foreground">{t.filesHelp}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor="auto-save" className="text-sm">
              {t.autoSave}
            </Label>
            <p
              id="auto-save-description"
              className="text-xs text-muted-foreground"
            >
              {t.autoSaveHelp}
            </p>
          </div>
          <Switch
            id="auto-save"
            aria-describedby="auto-save-description"
            checked={autoSave}
            onCheckedChange={setAutoSave}
          />
        </div>
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
