import { ImageOffIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"

type ImageState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string }

export interface PreviewImageProps {
  src?: string
  alt?: string
  title?: string
  /** Resolves a relative source to a data URL; results are cached by the caller. */
  load: (src: string) => Promise<string>
}

const REMOTE = /^https?:\/\//i

function ImageNote({ alt, children }: { alt?: string; children: string }) {
  return (
    <span
      role="img"
      aria-label={alt ? `${alt}: ${children}` : children}
      className="md-image-note"
    >
      <ImageOffIcon aria-hidden="true" />
      <span>
        {alt ? <strong>{alt}</strong> : null}
        {alt ? " " : null}
        {children}
      </span>
    </span>
  )
}

/**
 * Image in the preview. Local images load through the workspace (inside the
 * document's folder only). Remote images are not fetched: the editor works
 * offline, and the desktop app's content security policy blocks them.
 */
export function PreviewImage({ src, alt, title, load }: PreviewImageProps) {
  const remote = src !== undefined && REMOTE.test(src)
  const [state, setState] = useState<ImageState>({ status: "loading" })

  useEffect(() => {
    if (!src || remote) return
    let cancelled = false
    load(src).then(
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
  }, [src, remote, load])

  if (!src) return null
  if (remote) {
    const host = new URL(src).host
    return (
      <ImageNote
        alt={alt}
      >{`Remote image from ${host} is not loaded.`}</ImageNote>
    )
  }
  if (state.status === "loading") {
    return (
      <Skeleton
        role="status"
        aria-label={alt ? `Loading ${alt}` : "Loading image"}
        className="inline-block h-24 w-40 align-middle"
      />
    )
  }
  if (state.status === "error")
    return <ImageNote alt={alt}>{state.message}</ImageNote>
  return <img src={state.url} alt={alt ?? ""} title={title} />
}
