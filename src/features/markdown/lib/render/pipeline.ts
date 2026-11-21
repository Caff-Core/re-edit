import type { Root } from "hast"
import { toHtml } from "hast-util-to-html"
import rehypeHighlight from "rehype-highlight"
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeSchema,
} from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

/**
 * URL policy shared by preview and export. Links may point to the web, mail,
 * or an anchor in the document; images to the web. Local image resolution
 * arrives with 002.01. Anything else (javascript:, data:, file:) is removed.
 */
export const URL_PROTOCOLS: Record<"href" | "src", string[]> = {
  href: ["http", "https", "mailto"],
  src: ["http", "https"],
}

const schema: SanitizeSchema = {
  ...defaultSchema,
  // remark-rehype already prefixes generated ids (footnotes) with
  // "user-content-", and raw HTML never reaches the tree, so a second prefix
  // here would only break footnote links.
  clobberPrefix: "",
  protocols: {
    ...defaultSchema.protocols,
    ...URL_PROTOCOLS,
    cite: ["http", "https"],
  },
  attributes: {
    ...defaultSchema.attributes,
    // Fenced code keeps its language class for highlighting.
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./],
    ],
  },
}

/**
 * Markdown to a sanitized HTML tree. Raw HTML in the source is dropped by
 * remark-rehype (no allowDangerousHtml), and rehype-sanitize enforces the
 * element, attribute, and URL allow list before highlighting adds classes.
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeHighlight, { detect: false })

export function markdownToHast(source: string): Root {
  return processor.runSync(processor.parse(source)) as Root
}

export function markdownToHtml(source: string): string {
  return toHtml(markdownToHast(source))
}
