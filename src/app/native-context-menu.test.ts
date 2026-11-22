import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { suppressNativeContextMenu } from "./native-context-menu"

/** Fires a right-click and reports whether the webview menu would show. */
function nativeMenuShows(element: Element) {
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
  })
  element.dispatchEvent(event)
  return !event.defaultPrevented
}

describe("native context menu", () => {
  let cleanup: () => void

  beforeEach(() => {
    document.body.innerHTML = `
      <aside><p id="plain">Sidebar <b id="bold">text</b></p></aside>
      <input id="field" />
      <textarea id="area"></textarea>
      <div contenteditable="true"><span id="editor-line">line</span></div>
      <div contenteditable="false"><span id="locked">locked</span></div>
      <button id="tab">Tab</button>
    `
    cleanup = suppressNativeContextMenu()
  })

  afterEach(() => {
    cleanup()
    window.getSelection()?.removeAllRanges()
    document.body.innerHTML = ""
  })

  const $ = (id: string) => document.getElementById(id)!

  it("hides it on plain app surfaces", () => {
    expect(nativeMenuShows($("plain"))).toBe(false)
    expect(nativeMenuShows($("tab"))).toBe(false)
    expect(nativeMenuShows($("locked"))).toBe(false)
  })

  it("keeps it in text fields and the editor", () => {
    expect(nativeMenuShows($("field"))).toBe(true)
    expect(nativeMenuShows($("area"))).toBe(true)
    expect(nativeMenuShows($("editor-line"))).toBe(true)
  })

  it("keeps it on selected text", () => {
    const range = document.createRange()
    range.selectNodeContents($("bold"))
    window.getSelection()?.addRange(range)
    expect(nativeMenuShows($("bold"))).toBe(true)
    expect(nativeMenuShows($("tab"))).toBe(false)
  })

  it("leaves events an app menu already handled alone", () => {
    $("tab").addEventListener("contextmenu", (e) => e.preventDefault())
    expect(nativeMenuShows($("tab"))).toBe(false)
  })

  it("stops after cleanup", () => {
    cleanup()
    expect(nativeMenuShows($("plain"))).toBe(true)
    cleanup = () => {}
  })
})
