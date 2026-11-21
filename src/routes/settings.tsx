import { createFileRoute } from "@tanstack/react-router"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { useTheme } from "@/app/providers/theme-provider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const Route = createFileRoute("/settings")({
  staticData: { title: "Settings" },
  component: Settings,
})

const THEMES = [
  { value: "system", label: "System", icon: <MonitorIcon aria-hidden="true" /> },
  { value: "light", label: "Light", icon: <SunIcon aria-hidden="true" /> },
  { value: "dark", label: "Dark", icon: <MoonIcon aria-hidden="true" /> },
] as const

type ThemeValue = (typeof THEMES)[number]["value"]

function isThemeValue(value: string | undefined): value is ThemeValue {
  return THEMES.some((theme) => theme.value === value)
}

function Settings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex max-w-2xl min-w-0 flex-col gap-6 p-6">
      <section aria-labelledby="appearance-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="appearance-heading" className="text-sm font-medium">
            Appearance
          </h2>
          <p className="text-sm text-muted-foreground">
            System follows your desktop setting.
          </p>
        </div>
        <ToggleGroup
          aria-label="Theme"
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
              {option.icon}
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>
    </div>
  )
}
