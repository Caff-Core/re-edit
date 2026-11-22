import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(() => {
  cleanup()
})

// jsdom has no matchMedia. Report a wide, light-scheme desktop window.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom does no layout. CodeMirror measures ranges, so return empty rects.
const emptyRect = () => new DOMRect(0, 0, 0, 0)
const emptyRects = () =>
  Object.assign([], { item: () => null }) as unknown as DOMRectList
if (!Range.prototype.getBoundingClientRect)
  Range.prototype.getBoundingClientRect = emptyRect
if (!Range.prototype.getClientRects) Range.prototype.getClientRects = emptyRects
if (!document.elementFromPoint) document.elementFromPoint = () => null

// jsdom has no canvas. Report no 2D context instead of logging "not implemented".
HTMLCanvasElement.prototype.getContext = (() =>
  null) as unknown as HTMLCanvasElement["getContext"]

// jsdom has no scrollIntoView.
if (!Element.prototype.scrollIntoView)
  Element.prototype.scrollIntoView = () => {}
