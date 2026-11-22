import type { Rect } from "./model"

/**
 * Page geometry for the editor view. A page is drawn unrotated in an inner
 * layer of `width × height` points scaled by `scale`; the layer is turned by
 * whole quarter turns inside an outer box, so overlays use page coordinates
 * and turn with the page, as viewers do for annotations.
 */
export interface PageFrame {
  /** Unrotated page size in points. */
  width: number
  height: number
  /** CSS pixels per point. */
  scale: number
  /** Clockwise quarter turns shown (the page's own rotation plus edits). */
  turns: number
}

/** Size of the outer box in CSS pixels. */
export function outerSize({ width, height, scale, turns }: PageFrame) {
  const w = width * scale
  const h = height * scale
  return turns % 2 === 0 ? { width: w, height: h } : { width: h, height: w }
}

/** CSS transform (origin at the top left) that turns the inner layer into the outer box. */
export function layerTransform({ width, height, scale, turns }: PageFrame) {
  const w = width * scale
  const h = height * scale
  switch (turns % 4) {
    case 1:
      return `translate(${h}px, 0) rotate(90deg)`
    case 2:
      return `translate(${w}px, ${h}px) rotate(180deg)`
    case 3:
      return `translate(0, ${w}px) rotate(270deg)`
    default:
      return "none"
  }
}

/** A page rectangle as CSS box in the inner layer (pixels from the top left). */
export function toLayer(rect: Rect, { height, scale }: PageFrame) {
  return {
    left: rect.left * scale,
    top: (height - rect.top) * scale,
    width: (rect.right - rect.left) * scale,
    height: (rect.top - rect.bottom) * scale,
  }
}

/** A point in the outer box (pixels from its top left) as page coordinates. */
export function toPage(
  x: number,
  y: number,
  { width, height, scale, turns }: PageFrame
) {
  const w = width * scale
  const h = height * scale
  let lx = x
  let ly = y
  switch (turns % 4) {
    case 1:
      lx = y
      ly = h - x
      break
    case 2:
      lx = w - x
      ly = h - y
      break
    case 3:
      lx = w - y
      ly = x
      break
  }
  return { x: lx / scale, y: height - ly / scale }
}

/** A rectangle from two page points, in either order. */
export const rectFrom = (
  a: { x: number; y: number },
  b: { x: number; y: number }
): Rect => ({
  left: Math.min(a.x, b.x),
  right: Math.max(a.x, b.x),
  bottom: Math.min(a.y, b.y),
  top: Math.max(a.y, b.y),
})
