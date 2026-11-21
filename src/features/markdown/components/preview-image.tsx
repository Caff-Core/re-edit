import { ImageOffIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { useMessages } from "@/lib/i18n"
import { useDescribeError } from "@/services/native"

import { markdownMessages } from "../messages"

type ImageState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; error: unknown }

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
  const t = useMessages(markdownMessages)
  const describe = useDescribeError()
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
        if (!cancelled) setState({ status: "error", error })
      }
    )
    return () => {
      cancelled = true
    }
  }, [src, remote, load])

  if (!src) return null
  if (remote) {
    const host = new URL(src).host
    return <ImageNote alt={alt}>{t.remoteImage(host)}</ImageNote>
  }
  if (state.status === "loading") {
    return (
      <Skeleton
        role="status"
        aria-label={alt ? t.loadingNamedImage(alt) : t.loadingImage}
        className="inline-block h-24 w-40 align-middle"
      />
    )
  }
  if (state.status === "error")
    return <ImageNote alt={alt}>{describe(state.error)}</ImageNote>
  return <img src={state.url} alt={alt ?? ""} title={title} />
}
