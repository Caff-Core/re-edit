/**
 * Test fixtures loaded as raw text. Add a file under `fixtures/markdown` and
 * read it with `markdownFixture("name")` (file name without extension).
 */
const markdown = import.meta.glob<string>("./markdown/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
})

export function markdownFixtureNames(): string[] {
  return Object.keys(markdown)
    .map((path) => path.replace("./markdown/", "").replace(/\.md$/, ""))
    .sort()
}

export function markdownFixture(name: string): string {
  const source = markdown[`./markdown/${name}.md`]
  if (source === undefined) {
    throw new Error(
      `Unknown markdown fixture "${name}". Available: ${markdownFixtureNames().join(", ")}`
    )
  }
  return source
}
