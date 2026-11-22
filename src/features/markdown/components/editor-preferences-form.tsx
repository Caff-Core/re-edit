import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AArrowDownIcon,
  AArrowUpIcon,
  BaselineIcon,
  CodeXmlIcon,
  TypeIcon,
} from "lucide-react"

import { ChoiceGroup } from "@/components/molecules/choice-group"
import { useMessages } from "@/lib/i18n"

import {
  setEditorPreferences,
  useEditorPreferences,
  type EditorFontFamily,
  type EditorFontSize,
  type EditorPreferences,
} from "@/lib/codemirror/preferences"
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

const FONT_SIZES = [
  { value: "small", label: "fontSmall", icon: AArrowDownIcon },
  { value: "medium", label: "fontMedium", icon: TypeIcon },
  { value: "large", label: "fontLarge", icon: AArrowUpIcon },
] as const satisfies readonly {
  value: EditorFontSize
  label: Key
  icon: unknown
}[]

const FONT_FAMILIES = [
  { value: "mono", label: "fontMono", icon: CodeXmlIcon },
  { value: "sans", label: "fontSans", icon: BaselineIcon },
] as const satisfies readonly {
  value: EditorFontFamily
  label: Key
  icon: unknown
}[]

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
        <span id="editor-font-family" className="text-sm font-medium">
          {t.editorFont}
        </span>
        <ChoiceGroup
          labelledBy="editor-font-family"
          value={preferences.fontFamily}
          onChange={(fontFamily) => set({ fontFamily })}
          options={FONT_FAMILIES.map((family) => ({
            value: family.value,
            label: t[family.label],
            icon: family.icon,
          }))}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span id="editor-font-size" className="text-sm font-medium">
          {t.fontSize}
        </span>
        <ChoiceGroup
          labelledBy="editor-font-size"
          value={preferences.fontSize}
          onChange={(fontSize) => set({ fontSize })}
          options={FONT_SIZES.map((size) => ({
            value: size.value,
            label: t[size.label],
            icon: size.icon,
          }))}
        />
      </div>
    </div>
  )
}
