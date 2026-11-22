/** Where the webview's own menu stays useful: Cut, Copy, Paste, spelling. */
const EDITABLE =
  'input, textarea, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'

/** True when the element sits in, or overlaps, a non-empty text selection. */
function isSelected(target: Document, element: Element) {
  const selection = target.getSelection()
  if (!selection || selection.isCollapsed) return false
  for (let i = 0; i < selection.rangeCount; i++) {
    if (selection.getRangeAt(i).intersectsNode(element)) return true
  }
  return false
}

/**
 * Hides the webview's built-in context menu (Back, Forward, Stop, Reload,
 * Inspect Element), which means nothing in a desktop app. Text fields, the
 * editor, and selected text keep it for clipboard and spelling. App menus
 * opened on right-click, such as the tab menu, handle the event before it
 * reaches the document and are unaffected. Returns a cleanup function.
 */
export function suppressNativeContextMenu(target: Document = document) {
  const onContextMenu = (event: MouseEvent) => {
    if (event.defaultPrevented) return
    const element =
      event.target instanceof Element
        ? event.target
        : event.target instanceof Node
          ? event.target.parentElement
          : null
    if (element?.closest(EDITABLE)) return
    if (element && isSelected(target, element)) return
    event.preventDefault()
  }
  target.addEventListener("contextmenu", onContextMenu)
  return () => target.removeEventListener("contextmenu", onContextMenu)
}
