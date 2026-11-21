import { EditorSelection, type StateCommand } from "@codemirror/state"

/**
 * Wraps each selection in `marker`, or removes it when the selection is
 * already wrapped (inside or directly around the selection). An empty
 * selection inserts a marker pair with the cursor between them.
 */
export function toggleInline(marker: string): StateCommand {
  const size = marker.length
  return ({ state, dispatch }) => {
    const transaction = state.changeByRange((range) => {
      const text = state.sliceDoc(range.from, range.to)
      if (text.length >= size * 2 && text.startsWith(marker) && text.endsWith(marker)) {
        return {
          changes: { from: range.from, to: range.to, insert: text.slice(size, -size) },
          range: EditorSelection.range(range.from, range.to - size * 2),
        }
      }
      const before = state.sliceDoc(range.from - size, range.from)
      const after = state.sliceDoc(range.to, range.to + size)
      if (before === marker && after === marker) {
        return {
          changes: [
            { from: range.from - size, to: range.from },
            { from: range.to, to: range.to + size },
          ],
          range: EditorSelection.range(range.from - size, range.to - size),
        }
      }
      return {
        changes: [
          { from: range.from, insert: marker },
          { from: range.to, insert: marker },
        ],
        range: EditorSelection.range(range.from + size, range.to + size),
      }
    })
    dispatch(state.update(transaction, { scrollIntoView: true, userEvent: "input.format" }))
    return true
  }
}

const HEADING = /^(#{1,6})\s+/

/** Sets each selected line to heading `level`, or back to text if it already is. */
export function toggleHeading(level: number): StateCommand {
  return ({ state, dispatch }) => {
    const lines = new Set<number>()
    for (const range of state.selection.ranges) {
      const first = state.doc.lineAt(range.from).number
      const last = state.doc.lineAt(range.to).number
      for (let n = first; n <= last; n++) lines.add(n)
    }
    const changes = [...lines].map((n) => {
      const line = state.doc.line(n)
      const match = HEADING.exec(line.text)
      const prefix = "#".repeat(level) + " "
      if (match && match[1].length === level) {
        return { from: line.from, to: line.from + match[0].length, insert: "" }
      }
      return { from: line.from, to: line.from + (match?.[0].length ?? 0), insert: prefix }
    })
    dispatch(state.update({ changes, scrollIntoView: true, userEvent: "input.format" }))
    return true
  }
}

const URL_PLACEHOLDER = "https://"

/** Turns the selection into a link and selects the URL for typing. */
export const insertLink: StateCommand = ({ state, dispatch }) => {
  const transaction = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to) || "link text"
    const insert = `[${text}](${URL_PLACEHOLDER})`
    const urlFrom = range.from + text.length + 3
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(urlFrom, urlFrom + URL_PLACEHOLDER.length),
    }
  })
  dispatch(state.update(transaction, { scrollIntoView: true, userEvent: "input.format" }))
  return true
}
