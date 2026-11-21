import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { DocumentRegistry } from "./registry"
import {
  initialWorkspaceState,
  nextTitle,
  workspaceReducer,
  type WorkspaceState,
} from "./state"
import type { DocumentEditorHandle, DocumentStore } from "./types"

export interface WorkspaceApi {
  registry: DocumentRegistry
  state: WorkspaceState
  saveErrors: Record<string, string>
  newDocument(typeId: string): void
  activate(id: string): void
  close(id: string): void
  setDirty(id: string, dirty: boolean): void
  save(id: string): Promise<boolean>
  registerEditor(id: string, handle: DocumentEditorHandle | null): void
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null)

let sequence = 0

export function WorkspaceProvider({
  registry,
  store,
  children,
}: {
  registry: DocumentRegistry
  store: DocumentStore
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState)
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const editors = useRef(new Map<string, DocumentEditorHandle>())
  const pendingFocus = useRef<string | null>(null)
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  const newDocument = useCallback(
    (typeId: string) => {
      const type = registry.get(typeId)
      if (!type) throw new Error(`Unknown document type "${typeId}"`)
      const id = `doc-${++sequence}`
      pendingFocus.current = id
      dispatch({
        type: "open",
        document: {
          id,
          typeId,
          title: nextTitle(type.defaultTitle, stateRef.current.documents),
          initialContent: type.createEmpty(),
          dirty: false,
        },
      })
    },
    [registry]
  )

  const clearError = (id: string) =>
    setSaveErrors((errors) => {
      if (!(id in errors)) return errors
      const next = { ...errors }
      delete next[id]
      return next
    })

  const save = useCallback(
    async (id: string) => {
      const document = stateRef.current.documents.find((d) => d.id === id)
      const editor = editors.current.get(id)
      if (!document || !editor) return false
      const content = editor.serialize()
      try {
        await store.write(
          { id: document.id, typeId: document.typeId, title: document.title },
          content
        )
      } catch (error) {
        setSaveErrors((errors) => ({
          ...errors,
          [id]: error instanceof Error ? error.message : String(error),
        }))
        return false
      }
      editors.current.get(id)?.markSaved(content)
      clearError(id)
      return true
    },
    [store]
  )

  const api = useMemo<WorkspaceApi>(
    () => ({
      registry,
      state,
      saveErrors,
      newDocument,
      activate: (id) => dispatch({ type: "activate", id }),
      close: (id) => {
        dispatch({ type: "close", id })
        clearError(id)
      },
      setDirty: (id, dirty) => dispatch({ type: "dirty", id, dirty }),
      save,
      registerEditor: (id, handle) => {
        if (!handle) {
          editors.current.delete(id)
          return
        }
        editors.current.set(id, handle)
        if (pendingFocus.current === id) {
          pendingFocus.current = null
          queueMicrotask(() => handle.focus())
        }
      },
    }),
    [registry, state, saveErrors, newDocument, save]
  )

  return (
    <WorkspaceContext.Provider value={api}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceApi {
  const api = useContext(WorkspaceContext)
  if (!api)
    throw new Error("useWorkspace must be used inside WorkspaceProvider")
  return api
}
