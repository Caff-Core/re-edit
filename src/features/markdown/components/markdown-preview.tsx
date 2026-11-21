import type { Root } from "hast"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import {
  useDeferredValue,
  useMemo,
  type ComponentProps,
  type MouseEvent,
} from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useMessages } from "@/lib/i18n"

import { MERMAID_CLASS } from "../lib/render/mermaid-blocks"
import { markdownToHast } from "../lib/render/pipeline"
import { MermaidDiagram } from "./mermaid-diagram"
import { markdownMessages } from "../messages"
import { PreviewImage } from "./preview-image"
import "katex/dist/katex.min.css"
import "../lib/render/markdown.css"

type RenderResult = { tree: Root; error: null } | { tree: null; error: string }

/**
 * Rendered view of the Markdown source. Renders from a deferred value so
 * typing in the editor stays responsive.
 */
export function MarkdownPreview({
  source,
  title,
  loadImage,
}: {
  source: string
  title: string
  /** Resolves a relative image source to a data URL (cached by the caller). */
  loadImage: (src: string) => Promise<string>
}) {
  const t = useMessages(markdownMessages)
  const deferred = useDeferredValue(source)
  const components = useMemo(
    () => ({
      img: (props: { src?: string; alt?: string; title?: string }) => (
        <PreviewImage key={props.src} {...props} load={loadImage} />
      ),
      figure: ({
        className,
        "data-source": source,
        ...props
      }: ComponentProps<"figure"> & { "data-source"?: string }) =>
        className === MERMAID_CLASS && source !== undefined ? (
          <MermaidDiagram source={source} />
        ) : (
          <figure className={className} {...props} />
        ),
    }),
    [loadImage]
  )

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
          <AlertTitle>{t.previewFailed}</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}
      {deferred.trim().length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          {t.nothingToPreview}
        </p>
      ) : (
        <article
          aria-label={t.previewLabel(title)}
          className="markdown-body max-w-[80ch] px-6 py-4"
          onClick={onClick}
        >
          {tree
            ? toJsxRuntime(tree, { Fragment, jsx, jsxs, components })
            : null}
        </article>
      )}
    </div>
  )
}
