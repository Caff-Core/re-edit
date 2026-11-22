/// <reference types="node" />
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * WCAG 2.2 AA contrast for every theme defined in the stylesheets: 4.5:1 for
 * text and 3:1 for focus rings and icon-only fills (1.4.3, 1.4.11). A theme
 * is a `:root` or `.<name>` block that sets `--background` and its
 * `color-scheme`; new themes are checked without changing this file.
 */

// Read from disk: Vitest does not load stylesheet contents.
const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8")
const appCss = read("src/index.css")
const documentCss = read("src/features/markdown/lib/render/markdown.css")

type Rgb = [number, number, number]
type Tokens = Record<string, string>

/** Linear sRGB from oklch (Björn Ottosson's matrices), clipped to the gamut. */
function oklch(L: number, C: number, h: number): Rgb {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clip = (v: number) => Math.min(1, Math.max(0, v))
  return [
    clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function hex(value: string): Rgb {
  const channel = (i: number) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return [channel(1), channel(3), channel(5)]
}

function color(value: string, tokens: Tokens): Rgb {
  const v = value.trim()
  const reference = /^var\(--([a-z0-9-]+)\)$/.exec(v)
  if (reference) return color(tokens[reference[1]], tokens)
  const ok = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(v)
  if (ok) return oklch(Number(ok[1]), Number(ok[2]), Number(ok[3]))
  if (/^#[0-9a-f]{6}$/i.test(v)) return hex(v)
  throw new Error(`Unsupported color "${v}"`)
}

function contrast(a: Rgb, b: Rgb) {
  const luminance = ([r, g, bl]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * bl
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

function declarations(body: string): Tokens {
  const tokens: Tokens = {}
  for (const [, name, value] of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g))
    tokens[name] = value
  return tokens
}

function blocks(css: string, selector: RegExp) {
  return [...css.matchAll(/^([^{}@/\n][^{}\n]*)\{([^}]*)\}/gm)]
    .map(([, head, body]) => ({ head: head.trim(), body }))
    .filter(({ head }) => selector.test(head))
}

const merged = (css: string, head: RegExp) =>
  declarations(
    blocks(css, head)
      .map((b) => b.body)
      .join("")
  )

/**
 * A theme's effective tokens, layered as the browser applies them: `:root`,
 * then `.dark` for a dark theme (themes carry their scheme class), then the
 * theme class. Syntax colors layer the same way in the document stylesheet.
 */
const themes = blocks(appCss, /^(:root|\.[a-z-]+)$/)
  .filter(({ body }) => /--background:/.test(body))
  .map(({ head: name, body }) => {
    const dark = /color-scheme:\s*dark/.test(body)
    const own = name !== ":root" && name !== ".dark"
    const layer = (pattern: (n: string) => string) =>
      own ? merged(documentCss, new RegExp(pattern(name))) : {}
    return {
      name,
      tokens: {
        ...merged(appCss, /^:root$/),
        ...(dark ? merged(appCss, /^\.dark$/) : {}),
        ...declarations(body),
        ...merged(documentCss, /^\.markdown-body$/),
        ...(dark ? merged(documentCss, /^\.dark \.markdown-body$/) : {}),
        ...layer((n) => `^\\${n} \\.markdown-body$`),
      },
    }
  })

/** Text on its surface: 4.5:1. */
const TEXT: [string, string][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "popover"],
  // Shortcuts and hints inside highlighted menu items, and code text.
  ["muted-foreground", "muted"],
  ["muted-foreground", "accent"],
  ["foreground", "muted"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  ["md-syntax-keyword", "muted"],
  ["md-syntax-string", "muted"],
  ["md-syntax-number", "muted"],
  ["md-syntax-title", "muted"],
  ["md-syntax-comment", "muted"],
]

/** Focus rings and the icon-only brand mark: 3:1. */
const NON_TEXT: [string, string][] = [
  ["ring", "background"],
  ["ring", "card"],
  ["ring", "popover"],
  ["sidebar-ring", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
]

describe("AC-009: theme contrast", () => {
  it("finds the light and dark themes", () => {
    expect(themes.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        ":root",
        ".dark",
        ".theme-solarized-light",
        ".theme-solarized-dark",
        ".theme-dracula",
        ".theme-nord",
        ".theme-gruvbox-light",
        ".theme-gruvbox-dark",
        ".theme-catppuccin-latte",
        ".theme-catppuccin-mocha",
      ])
    )
  })

  describe.each(themes)("$name", ({ tokens }) => {
    it.each(TEXT)("text %s on %s is at least 4.5:1", (fg, bg) => {
      const ratio = contrast(
        color(tokens[fg], tokens),
        color(tokens[bg], tokens)
      )
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it.each(NON_TEXT)("%s on %s is at least 3:1", (fg, bg) => {
      const ratio = contrast(
        color(tokens[fg], tokens),
        color(tokens[bg], tokens)
      )
      expect(ratio).toBeGreaterThanOrEqual(3)
    })
  })
})
