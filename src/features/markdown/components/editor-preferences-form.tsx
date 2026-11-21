import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import {
  setEditorPreferences,
  useEditorPreferences,
  type EditorFontSize,
  type EditorPreferences,
} from "../lib/preferences"

const SWITCHES: {
  key: "lineWrapping" | "lineNumbers" | "spellCheck"
  label: string
  description: string
}[] = [
  { key: "lineWrapping", label: "Wrap lines", description: "Long lines wrap to the window width." },
  { key: "lineNumbers", label: "Line numbers", description: "Show a line number gutter." },
  { key: "spellCheck", label: "Spell check", description: "Underline misspelled words." },
]

const FONT_SIZES: { value: EditorFontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
]

function isFontSize(value: string | undefined): value is EditorFontSize {
  return FONT_SIZES.some((size) => size.value === value)
}

/** Editor settings. Changes apply to open editors immediately. */
export function EditorPreferencesForm() {
  const preferences = useEditorPreferences()
  const set = (patch: Partial<EditorPreferences>) => setEditorPreferences(patch)

  return (
    <div className="flex flex-col gap-4">
      {SWITCHES.map((option) => (
        <div key={option.key} className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor={`editor-${option.key}`} className="text-sm">
              {option.label}
            </Label>
            <p id={`editor-${option.key}-description`} className="text-xs text-muted-foreground">
              {option.description}
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
          Font size
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
              {size.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  )
}
