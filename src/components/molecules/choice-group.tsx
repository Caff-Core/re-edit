import type { ComponentType, SVGProps } from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  /** An icon component, such as one from lucide-react. Optional when the
   * label says it all, such as a percentage. */
  icon?: ComponentType<SVGProps<SVGSVGElement> & { "data-icon"?: string }>
  /** Language of the label, for names written in their own language. */
  lang?: string
}

const PRESSED =
  "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground dark:aria-pressed:bg-primary dark:aria-pressed:hover:bg-primary/90"

export interface ChoiceGroupProps<T extends string> {
  options: readonly ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Id of the visible text naming the group. */
  labelledBy?: string
  /** Name of the group when no visible text names it. */
  label?: string
}

/**
 * One choice from a few, as joined outline buttons with icons (ReUI's
 * c-button-group-3 pattern). The chosen button reports `aria-pressed` and
 * fills with the theme's primary color: a muted fill nearly vanishes
 * against the outline fill in some themes (Dracula), while primary text on
 * primary is contrast-checked in every theme. Every button stays in the
 * tab order.
 */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  labelledBy,
  label,
}: ChoiceGroupProps<T>) {
  return (
    <ButtonGroup aria-labelledby={labelledBy} aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant="outline"
            className={PRESSED}
            aria-pressed={selected}
            lang={option.lang}
            onClick={() => onChange(option.value)}
          >
            {option.icon ? (
              <option.icon aria-hidden="true" data-icon="inline-start" />
            ) : null}
            {option.label}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
