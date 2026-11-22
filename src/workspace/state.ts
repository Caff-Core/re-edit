import type { OpenDocument } from "./types"

export interface WorkspaceState {
  documents: OpenDocument[]
  activeId: string | null
}

export type WorkspaceAction =
  | { type: "open"; document: OpenDocument }
  | { type: "close"; id: string }
  | { type: "closeMany"; ids: string[] }
  | { type: "activate"; id: string }
  | { type: "dirty"; id: string; dirty: boolean }
  | { type: "rename"; id: string; path: string; title: string }
  | { type: "modified"; id: string; modifiedMs: number | null }

export const initialWorkspaceState: WorkspaceState = {
  documents: [],
  activeId: null,
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "open":
      return {
        documents: [...state.documents, action.document],
        activeId: action.document.id,
      }
    case "close":
      return closeDocuments(state, [action.id])
    case "closeMany":
      return closeDocuments(state, action.ids)
    case "activate":
      return state.documents.some((d) => d.id === action.id)
        ? { ...state, activeId: action.id }
        : state
    case "rename":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.id
            ? { ...d, path: action.path, title: action.title }
            : d
        ),
      }
    case "modified":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.id ? { ...d, modifiedMs: action.modifiedMs } : d
        ),
      }
    case "dirty": {
      const target = state.documents.find((d) => d.id === action.id)
      if (!target || target.dirty === action.dirty) return state
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.id ? { ...d, dirty: action.dirty } : d
        ),
      }
    }
  }
}

/**
 * Removes the given documents. When the active one goes, the nearest
 * remaining tab takes over: the next one to its right, else the one to
 * its left, the same rule for one tab or many.
 */
function closeDocuments(state: WorkspaceState, ids: string[]): WorkspaceState {
  const closing = new Set(ids)
  const documents = state.documents.filter((d) => !closing.has(d.id))
  if (documents.length === state.documents.length) return state
  if (state.activeId === null || !closing.has(state.activeId)) {
    return { documents, activeId: state.activeId }
  }
  const index = state.documents.findIndex((d) => d.id === state.activeId)
  const after = state.documents
    .slice(index + 1)
    .find((d) => !closing.has(d.id))
  const before = state.documents
    .slice(0, index)
    .findLast((d) => !closing.has(d.id))
  return { documents, activeId: (after ?? before)?.id ?? null }
}

/** "Untitled", then "Untitled 2", "Untitled 3", ... among open titles. */
export function nextTitle(base: string, documents: OpenDocument[]): string {
  const taken = new Set(documents.map((d) => d.title))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    if (!taken.has(`${base} ${n}`)) return `${base} ${n}`
  }
}
