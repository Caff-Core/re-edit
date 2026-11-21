import type { Root } from "hast"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { useDeferredValue, useMemo, type MouseEvent } from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { markdownToHast } from "../lib/render/pipeline"
import "../lib/render/markdown.css"

type RenderResult = { tree: Root; error: null } | { tree: null; error: string }

/**
 * Rendered view of the Markdown source. Renders from a deferred value so
 * typing in the editor stays responsive.
 */
export function MarkdownPreview({
  source,
  title,
}: {
  source: string
  title: string
}) {
  const deferred = useDeferredValue(source)

  const result = useMemo<RenderResult>(() => {
    try {
      return { tree: markdownToHast(deferred), error: null }
    } catch (error) {
      return {
        tree: null,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [deferred])

  const tree = result.tree
  // Anchors stay inside the preview; other links never navigate the app.
  const onClick = (event: MouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement).closest("a")
    if (!anchor) return
    event.preventDefault()
    const href = anchor.getAttribute("href") ?? ""
    if (href.startsWith("#")) {
      const target = event.currentTarget.querySelector<HTMLElement>(
        `[id="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`
      )
      target?.scrollIntoView({ block: "start" })
      target
        ?.querySelector<HTMLElement>("a, [tabindex]")
        ?.focus({ preventScroll: true })
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
      {result.error ? (
        <Alert variant="destructive" className="m-2 w-auto">
          <AlertTitle>Preview could not update</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}
      {deferred.trim().length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Nothing to preview yet.
        </p>
      ) : (
        <article
          aria-label={`${title}, preview`}
          className="markdown-body max-w-[80ch] px-6 py-4"
          onClick={onClick}
        >
          {tree ? toJsxRuntime(tree, { Fragment, jsx, jsxs }) : null}
        </article>
      )}
    </div>
  )
}
