let sequence = 0
const cache = new Map<string, Promise<string>>()

/** Accessible title declared in the diagram source with `accTitle:`. */
export function mermaidTitle(source: string): string | null {
  return /^\s*accTitle:\s*(.+)$/m.exec(source)?.[1]?.trim() ?? null
}

/**
 * Mermaid sizes its SVG with width="100%" and a max-width style. Inside an
 * <img> that stretches small diagrams to the column width, so give the root
 * its natural width; the viewBox keeps the proportions.
 */
export function fixedWidth(svg: string): string {
  const width = /max-width:\s*([\d.]+)px/.exec(svg)?.[1]
  return width
    ? svg.replace(/(<svg\b[^>]*?\s)width="100%"/, `$1width="${width}"`)
    : svg
}

/**
 * Renders Mermaid source to an SVG data URL. Mermaid loads on first use.
 * Strict security and SVG text labels keep the output free of HTML and
 * script; shown through <img>, nothing inside it can run.
 */
export function renderMermaid(source: string, dark: boolean): Promise<string> {
  const key = `${dark ? "dark" : "light"}\n${source}`
  let pending = cache.get(key)
  if (!pending) {
    pending = (async () => {
      const { default: mermaid } = await import("mermaid")
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        htmlLabels: false,
        theme: dark ? "dark" : "default",
      })
      await mermaid.parse(source)
      const { svg } = await mermaid.render(`md-mermaid-${++sequence}`, source)
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fixedWidth(svg))}`
    })()
    cache.set(key, pending)
  }
  return pending
}
