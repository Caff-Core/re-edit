import { useEffect, useRef } from "react"

import { renderPage, type OpenPdf } from "../lib/pdfium"

/**
 * One page drawn by PDFium, unrotated, at `cssScale` CSS pixels per point.
 * Renders at the device pixel ratio so text stays sharp, and only when the
 * page or scale changes.
 */
export function PageCanvas({
  pdf,
  index,
  width,
  height,
  cssScale,
  className,
}: {
  pdf: OpenPdf
  index: number
  width: number
  height: number
  cssScale: number
  className?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext("2d")
    if (!element || !context) return
    let cancelled = false
    // Let the frame paint before the render so typing and focus stay instant.
    const timer = setTimeout(() => {
      if (cancelled) return
      const ratio = window.devicePixelRatio || 1
      const image = renderPage(pdf, index, cssScale * ratio)
      element.width = image.width
      element.height = image.height
      context.putImageData(
        new ImageData(image.rgba, image.width, image.height),
        0,
        0
      )
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pdf, index, cssScale])

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className={className}
      style={{ width: width * cssScale, height: height * cssScale }}
    />
  )
}
