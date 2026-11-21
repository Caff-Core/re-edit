import type { OpenDocument } from "./types"

export interface WorkspaceState {
  documents: OpenDocument[]
  activeId: string | null
}

export type WorkspaceAction =
  | { type: "open"; document: OpenDocument }
  | { type: "close"; id: string }
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
    case "close": {
      const index = state.documents.findIndex((d) => d.id === action.id)
      if (index === -1) return state
      const documents = state.documents.filter((d) => d.id !== action.id)
      const activeId =
        state.activeId === action.id
          ? ((documents[index] ?? documents[index - 1] ?? null)?.id ?? null)
          : state.activeId
      return { documents, activeId }
    }
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

/** "Untitled", then "Untitled 2", "Untitled 3", ... among open titles. */
export function nextTitle(base: string, documents: OpenDocument[]): string {
  const taken = new Set(documents.map((d) => d.title))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    if (!taken.has(`${base} ${n}`)) return `${base} ${n}`
  }
}
