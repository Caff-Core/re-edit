import { WorkflowIcon } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import { Skeleton } from "@/components/ui/skeleton"

import { mermaidTitle, renderMermaid } from "../lib/render/mermaid-render"

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

const isDark = () => document.documentElement.classList.contains("dark")

type DiagramState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string }

/** A Mermaid diagram with its source as a text alternative. */
export function MermaidDiagram({ source }: { source: string }) {
  const dark = useSyncExternalStore(subscribeToTheme, isDark, () => false)
  const [state, setState] = useState<DiagramState>({ status: "loading" })
  const title = mermaidTitle(source)

  useEffect(() => {
    let cancelled = false
    renderMermaid(source, dark).then(
      (url) => {
        if (!cancelled) setState({ status: "ready", url })
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [source, dark])

  return (
    <figure className="md-mermaid">
      {state.status === "loading" ? (
        <Skeleton
          role="status"
          aria-label="Rendering diagram"
          className="h-32 w-full max-w-md"
        />
      ) : state.status === "error" ? (
        <span
          role="img"
          aria-label={`Diagram could not be drawn: ${state.message}`}
          className="md-image-note"
        >
          <WorkflowIcon aria-hidden="true" />
          <span>
            <strong>Diagram could not be drawn.</strong> {state.message}
          </span>
        </span>
      ) : (
        <img
          src={state.url}
          alt={title ? `Diagram: ${title}` : "Diagram. Its source is below."}
        />
      )}
      <details open={state.status === "error"}>
        <summary>Diagram source</summary>
        <pre>
          <code>{source}</code>
        </pre>
      </details>
    </figure>
  )
}
