import type { Element, Root, Text } from "hast"
import { visit } from "unist-util-visit"

/** Class on the placeholder the preview turns into a rendered diagram. */
export const MERMAID_CLASS = "md-mermaid"

function textOf(node: Element): string {
  return node.children
    .map((child) =>
      child.type === "text"
        ? (child as Text).value
        : child.type === "element"
          ? textOf(child)
          : ""
    )
    .join("")
}

/**
 * Replaces ```mermaid code blocks with a placeholder figure holding the
 * source. Runs after sanitizing; the preview renders the diagram and keeps
 * the source available as a text fallback.
 */
export function rehypeMermaid() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return
      const code = node.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "code"
      )
      const classes = code?.properties?.className
      if (
        !code ||
        !Array.isArray(classes) ||
        !classes.includes("language-mermaid")
      )
        return
      parent.children[index] = {
        type: "element",
        tagName: "figure",
        properties: { className: [MERMAID_CLASS], dataSource: textOf(code) },
        children: [],
      }
    })
  }
}
