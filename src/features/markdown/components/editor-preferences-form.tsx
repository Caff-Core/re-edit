import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useMessages } from "@/lib/i18n"

import {
  setEditorPreferences,
  useEditorPreferences,
  type EditorFontSize,
  type EditorPreferences,
} from "../lib/preferences"
import { markdownMessages, type MarkdownMessages } from "../messages"

/** Keys of plain-string messages, so a lookup always yields a string. */
type Key = {
  [K in keyof MarkdownMessages]: MarkdownMessages[K] extends string ? K : never
}[keyof MarkdownMessages]

const SWITCHES: {
  key: "lineWrapping" | "lineNumbers" | "spellCheck"
  label: Key
  description: Key
}[] = [
  { key: "lineWrapping", label: "wrapLines", description: "wrapLinesHelp" },
  { key: "lineNumbers", label: "lineNumbers", description: "lineNumbersHelp" },
  { key: "spellCheck", label: "spellCheck", description: "spellCheckHelp" },
]

const FONT_SIZES: { value: EditorFontSize; label: Key }[] = [
  { value: "small", label: "fontSmall" },
  { value: "medium", label: "fontMedium" },
  { value: "large", label: "fontLarge" },
]

function isFontSize(value: string | undefined): value is EditorFontSize {
  return FONT_SIZES.some((size) => size.value === value)
}

/** Editor settings. Changes apply to open editors immediately. */
export function EditorPreferencesForm() {
  const t = useMessages(markdownMessages)
  const preferences = useEditorPreferences()
  const set = (patch: Partial<EditorPreferences>) => setEditorPreferences(patch)

  return (
    <div className="flex flex-col gap-4">
      {SWITCHES.map((option) => (
        <div
          key={option.key}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor={`editor-${option.key}`} className="text-sm">
              {t[option.label]}
            </Label>
            <p
              id={`editor-${option.key}-description`}
              className="text-xs text-muted-foreground"
            >
              {t[option.description]}
            </p>
          </div>
          <Switch
            id={`editor-${option.key}`}
            aria-describedby={`editor-${option.key}-description`}
            checked={preferences[option.key]}
            onCheckedChange={(checked) => set({ [option.key]: checked })}
          />
        </div>
      ))}
      <div className="flex items-center justify-between gap-4">
        <span id="editor-font-size" className="text-sm font-medium">
          {t.fontSize}
        </span>
        <ToggleGroup
          aria-labelledby="editor-font-size"
          variant="outline"
          size="sm"
          value={[preferences.fontSize]}
          onValueChange={(next) => {
            const [value] = next
            if (isFontSize(value)) set({ fontSize: value })
          }}
        >
          {FONT_SIZES.map((size) => (
            <ToggleGroupItem key={size.value} value={size.value}>
              {t[size.label]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  )
}
