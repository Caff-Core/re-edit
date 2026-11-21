import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { FileService, FolderListing } from "@/services/native"

import { basename, isInside } from "./paths"
import type { DocumentRegistry } from "./registry"
import {
  addRecent,
  type RecentEntry,
  type Session,
  type SessionStore,
} from "./session"
import {
  initialWorkspaceState,
  nextTitle,
  workspaceReducer,
  type WorkspaceState,
} from "./state"
import type { DocumentEditorHandle, OpenDocument } from "./types"

export type FolderState =
  | { path: string; status: "loading" }
  | { path: string; status: "ready"; listing: FolderListing }
  | { path: string; status: "error"; error: string }

export interface WorkspaceNotice {
  message: string
  retry?: () => void
}

export interface WorkspaceApi {
  registry: DocumentRegistry
  state: WorkspaceState
  folder: FolderState | null
  recents: RecentEntry[]
  notice: WorkspaceNotice | null
  saveErrors: Record<string, string>
  newDocument(typeId: string): void
  openPath(path: string): Promise<void>
  openFileDialog(): Promise<void>
  openFolderDialog(): Promise<void>
  openFolder(path: string): Promise<void>
  closeFolder(): void
  openRecent(entry: RecentEntry): Promise<void>
  activate(id: string): void
  close(id: string): void
  setDirty(id: string, dirty: boolean): void
  save(id: string): Promise<boolean>
  saveAs(id: string): Promise<boolean>
  dismissNotice(): void
  noteEdit(id: string): void
  resolveAsset(id: string, src: string): Promise<string>
  /** A stable resolver bound to one document, for editors to memoize on. */
  assetResolver(id: string): (src: string) => Promise<string>
  registerEditor(id: string, handle: DocumentEditorHandle | null): void
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null)

/** Delay before an edit is written to the recovery draft. */
export const DRAFT_DELAY_MS = 400

let sequence = 0
const nextId = () => `doc-${++sequence}`

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function WorkspaceProvider({
  registry,
  files,
  session,
  children,
}: {
  registry: DocumentRegistry
  files: FileService
  session: SessionStore
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState)
  const [folder, setFolder] = useState<FolderState | null>(null)
  const [recents, setRecents] = useState<RecentEntry[]>(() =>
    session.loadRecents()
  )
  const [notice, setNotice] = useState<WorkspaceNotice | null>(null)
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const editors = useRef(new Map<string, DocumentEditorHandle>())
  const pendingFocus = useRef<string | null>(null)
  const stateRef = useRef(state)
  const folderRef = useRef(folder)
  const restored = useRef(false)
  const restoring = useRef(false)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const extensions = useMemo(
    () => registry.list().flatMap((t) => t.extensions),
    [registry]
  )

  useLayoutEffect(() => {
    stateRef.current = state
    folderRef.current = folder
  }, [state, folder])

  const rememberRecent = useCallback(
    (entry: RecentEntry) => {
      setRecents((current) => {
        const next = addRecent(current, entry)
        session.saveRecents(next)
        return next
      })
    },
    [session]
  )

  const forgetRecent = useCallback(
    (path: string) => {
      setRecents((current) => {
        const next = current.filter((r) => r.path !== path)
        session.saveRecents(next)
        return next
      })
    },
    [session]
  )

  // Session: open tabs, the active tab, the folder, and drafts of dirty tabs.
  const persistSession = useCallback(() => {
    if (!restored.current) return
    const { documents, activeId } = stateRef.current
    const snapshot: Session = {
      documents: documents.map((d) => ({
        id: d.id,
        typeId: d.typeId,
        title: d.title,
        path: d.path,
        draft: d.dirty
          ? (editors.current.get(d.id)?.serialize() ?? d.initialContent)
          : null,
      })),
      activeId,
      folder: folderRef.current?.path ?? null,
    }
    session.saveSession(snapshot)
  }, [session])

  useEffect(() => {
    persistSession()
  }, [state, folder, persistSession])

  useEffect(
    () => () => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
    },
    []
  )

  const openDocument = useCallback((document: OpenDocument, focus: boolean) => {
    if (focus) pendingFocus.current = document.id
    dispatch({ type: "open", document })
  }, [])

  const newDocument = useCallback(
    (typeId: string) => {
      const type = registry.get(typeId)
      if (!type) throw new Error(`Unknown document type "${typeId}"`)
      const content = type.createEmpty()
      openDocument(
        {
          id: nextId(),
          typeId,
          title: nextTitle(type.defaultTitle, stateRef.current.documents),
          path: null,
          initialContent: content,
          savedContent: content,
          dirty: false,
        },
        true
      )
    },
    [registry, openDocument]
  )

  const openPath = useCallback(
    async (path: string) => {
      const existing = stateRef.current.documents.find((d) => d.path === path)
      if (existing) {
        dispatch({ type: "activate", id: existing.id })
        return
      }
      const type = registry.forPath(path)
      if (!type) {
        setNotice({
          message: `${basename(path)} is not a supported document type.`,
        })
        return
      }
      try {
        const file = await files.readTextFile(path)
        openDocument(
          {
            id: nextId(),
            typeId: type.id,
            title: basename(path),
            path,
            initialContent: file.content,
            savedContent: file.content,
            dirty: false,
          },
          true
        )
        rememberRecent({ path, kind: "file" })
      } catch (error) {
        setNotice({
          message: `Could not open ${basename(path)}: ${message(error)}`,
          retry: () => void openPath(path),
        })
      }
    },
    [files, registry, openDocument, rememberRecent]
  )

  const openFolder = useCallback(
    async (path: string, remember = true) => {
      setFolder({ path, status: "loading" })
      try {
        const listing = await files.listFolder(path, extensions)
        setFolder({ path, status: "ready", listing })
        if (remember) rememberRecent({ path, kind: "folder" })
      } catch (error) {
        setFolder({ path, status: "error", error: message(error) })
      }
    },
    [files, extensions, rememberRecent]
  )

  const openFileDialog = useCallback(async () => {
    try {
      const path = await files.pickOpenFile(extensions)
      if (path) await openPath(path)
    } catch (error) {
      setNotice({ message: `Could not open a file: ${message(error)}` })
    }
  }, [files, extensions, openPath])

  const openFolderDialog = useCallback(async () => {
    try {
      const path = await files.pickFolder()
      if (path) await openFolder(path)
    } catch (error) {
      setNotice({ message: `Could not open a folder: ${message(error)}` })
    }
  }, [files, openFolder])

  const openRecent = useCallback(
    async (entry: RecentEntry) => {
      if (entry.kind === "folder") {
        await openFolder(entry.path)
        if (folderRef.current?.status === "error") forgetRecent(entry.path)
        return
      }
      await openPath(entry.path)
    },
    [openFolder, openPath, forgetRecent]
  )

  const clearError = (id: string) =>
    setSaveErrors((errors) => {
      if (!(id in errors)) return errors
      const next = { ...errors }
      delete next[id]
      return next
    })

  const writeDocument = useCallback(
    async (id: string, path: string) => {
      const editor = editors.current.get(id)
      if (!editor) return false
      const content = editor.serialize()
      try {
        await files.writeTextFile(path, content)
      } catch (error) {
        setSaveErrors((errors) => ({ ...errors, [id]: message(error) }))
        return false
      }
      editors.current.get(id)?.markSaved(content)
      clearError(id)
      const current = folderRef.current
      if (current && isInside(path, current.path))
        void openFolder(current.path, false)
      return true
    },
    [files, openFolder]
  )

  const saveAs = useCallback(
    async (id: string) => {
      const document = stateRef.current.documents.find((d) => d.id === id)
      const type = document && registry.get(document.typeId)
      if (!document || !type) return false
      const suggested = document.path
        ? basename(document.path)
        : `${document.title}${type.extensions[0] ?? ""}`
      let path: string | null
      try {
        path = await files.pickSavePath(suggested)
      } catch (error) {
        setSaveErrors((errors) => ({ ...errors, [id]: message(error) }))
        return false
      }
      if (!path) return false
      const saved = await writeDocument(id, path)
      if (saved) {
        dispatch({ type: "rename", id, path, title: basename(path) })
        rememberRecent({ path, kind: "file" })
      }
      return saved
    },
    [files, registry, writeDocument, rememberRecent]
  )

  const save = useCallback(
    async (id: string) => {
      const document = stateRef.current.documents.find((d) => d.id === id)
      if (!document) return false
      return document.path ? writeDocument(id, document.path) : saveAs(id)
    },
    [writeDocument, saveAs]
  )

  const noteEdit = useCallback(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(persistSession, DRAFT_DELAY_MS)
  }, [persistSession])

  // Restore the previous session once: drafts come back unsaved against the
  // file on disk, clean files are read again.
  useEffect(() => {
    if (restoring.current) return
    restoring.current = true
    const previous = session.loadSession()
    void (async () => {
      const failures: string[] = []
      for (const saved of previous?.documents ?? []) {
        const type = registry.get(saved.typeId)
        if (!type) continue
        const number = /^doc-(\d+)$/.exec(saved.id)?.[1]
        if (number) sequence = Math.max(sequence, Number(number))
        let onDisk: string | null = null
        if (saved.path) {
          try {
            onDisk = (await files.readTextFile(saved.path)).content
          } catch (error) {
            if (saved.draft === null) {
              failures.push(`${saved.title} (${message(error)})`)
              continue
            }
          }
        }
        const savedContent = onDisk ?? (saved.path ? "" : type.createEmpty())
        openDocument(
          {
            id: saved.id,
            typeId: saved.typeId,
            title: saved.title,
            path: saved.path,
            initialContent: saved.draft ?? savedContent,
            savedContent,
            dirty: saved.draft !== null && saved.draft !== savedContent,
          },
          false
        )
      }
      if (previous?.activeId)
        dispatch({ type: "activate", id: previous.activeId })
      if (previous?.folder) await openFolder(previous.folder, false)
      if (failures.length > 0) {
        setNotice({ message: `Could not reopen ${failures.join(", ")}.` })
      }
      restored.current = true
      persistSession()
    })()
  }, [session, registry, files, openDocument, openFolder, persistSession])

  const resolveAsset = useCallback(
    async (id: string, src: string) => {
      const document = stateRef.current.documents.find((d) => d.id === id)
      if (!document?.path) {
        throw new Error("Save the document to show local images")
      }
      const image = await files.readDocumentImage(document.path, src)
      return `data:${image.mime};base64,${image.base64}`
    },
    [files]
  )

  const assetResolvers = useRef(
    new Map<string, (src: string) => Promise<string>>()
  )
  const assetResolver = useCallback(
    (id: string) => {
      let resolver = assetResolvers.current.get(id)
      if (!resolver) {
        resolver = (src: string) => resolveAsset(id, src)
        assetResolvers.current.set(id, resolver)
      }
      return resolver
    },
    [resolveAsset]
  )

  const api = useMemo<WorkspaceApi>(
    () => ({
      registry,
      state,
      folder,
      recents,
      notice,
      saveErrors,
      newDocument,
      openPath,
      openFileDialog,
      openFolderDialog,
      openFolder: (path) => openFolder(path),
      closeFolder: () => setFolder(null),
      openRecent,
      activate: (id) => dispatch({ type: "activate", id }),
      close: (id) => {
        dispatch({ type: "close", id })
        clearError(id)
      },
      setDirty: (id, dirty) => dispatch({ type: "dirty", id, dirty }),
      save,
      saveAs,
      dismissNotice: () => setNotice(null),
      noteEdit,
      resolveAsset,
      assetResolver,
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
    [
      registry,
      state,
      folder,
      recents,
      notice,
      saveErrors,
      newDocument,
      openPath,
      openFileDialog,
      openFolderDialog,
      openFolder,
      openRecent,
      save,
      saveAs,
      noteEdit,
      resolveAsset,
      assetResolver,
    ]
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
