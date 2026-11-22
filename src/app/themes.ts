/** Interface themes (REQ-007). "system" follows the desktop light or dark setting. */
export const THEMES = [
  "system",
  "light",
  "dark",
  "solarized-light",
  "solarized-dark",
  "dracula",
  "nord",
  "gruvbox-light",
  "gruvbox-dark",
  "catppuccin-latte",
  "catppuccin-mocha",
  "neon",
] as const

export type Theme = (typeof THEMES)[number]
export type ConcreteTheme = Exclude<Theme, "system">
export type ColorScheme = "light" | "dark"

/** Scheme class and optional palette class each theme puts on <html>. */
export const THEME_CLASSES: Record<
  ConcreteTheme,
  { scheme: ColorScheme; palette: string | null }
> = {
  light: { scheme: "light", palette: null },
  dark: { scheme: "dark", palette: null },
  "solarized-light": { scheme: "light", palette: "theme-solarized-light" },
  "solarized-dark": { scheme: "dark", palette: "theme-solarized-dark" },
  dracula: { scheme: "dark", palette: "theme-dracula" },
  nord: { scheme: "dark", palette: "theme-nord" },
  "gruvbox-light": { scheme: "light", palette: "theme-gruvbox-light" },
  "gruvbox-dark": { scheme: "dark", palette: "theme-gruvbox-dark" },
  "catppuccin-latte": { scheme: "light", palette: "theme-catppuccin-latte" },
  "catppuccin-mocha": { scheme: "dark", palette: "theme-catppuccin-mocha" },
  neon: { scheme: "dark", palette: "theme-neon" },
}

const ALL_CLASSES = [
  "light",
  "dark",
  ...Object.values(THEME_CLASSES).flatMap((t) => t.palette ?? []),
]

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}

export function resolveTheme(theme: Theme, systemDark: boolean): ConcreteTheme {
  if (theme !== "system") return theme
  return systemDark ? "dark" : "light"
}

/** Puts a theme's classes on an element, removing any other theme's. */
export function applyThemeClasses(root: HTMLElement, theme: ConcreteTheme) {
  const { scheme, palette } = THEME_CLASSES[theme]
  root.classList.remove(...ALL_CLASSES)
  root.classList.add(scheme)
  if (palette) root.classList.add(palette)
}
