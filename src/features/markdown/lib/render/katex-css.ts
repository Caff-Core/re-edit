/**
 * KaTeX's stylesheet with each font inlined as woff2. Every engine the
 * export targets reads woff2, so the woff and ttf fallbacks are dropped.
 */
export async function inlineKatexCss(
  css: string,
  fonts: Record<string, () => Promise<string>>
): Promise<string> {
  const urls = new Map<string, string>()
  await Promise.all(
    Object.entries(fonts).map(async ([path, load]) => {
      const name = /([\w-]+)\.woff2$/.exec(path)?.[1]
      if (name) urls.set(name, await load())
    })
  )
  return css.replace(
    /src:url\(fonts\/([\w-]+)\.woff2\) format\("woff2"\)[^;}]*/g,
    (rule, name: string) => {
      const url = urls.get(name)
      return url ? `src:url(${url}) format("woff2")` : rule
    }
  )
}
