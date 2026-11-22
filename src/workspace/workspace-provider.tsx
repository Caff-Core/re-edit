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

import { useLocale } from "@/lib/i18n"
import {
  FileError,
  isConflict,
  type ExportFormat,
  type FileService,
  type FolderListing,
} from "@/services/native"

import { AUTO_SAVE_DELAY_MS } from "./auto-save-setting"
import { workspaceMessages, type WorkspaceText } from "./messages"

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
import type {
  DocumentCommand,
  DocumentCommandState,
  DocumentEditorHandle,
  DocumentType,
  OpenDocument,
} from "./types"

export type FolderState =
  | { path: string; status: "loading" }
  | { path: string; status: "ready"; listing: FolderListing }
  | { path: string; status: "error"; error: unknown }

/** The disk version of a document that changed while it had unsaved edits. */
export interface DiskConflict {
  /** The file on disk, or null when it was deleted. */
  disk: Uint8Array | null
  modifiedMs: number
}

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, i) => byte === b[i])

/** "Report.pdf" -> "Report (edited).pdf", for a type that saves a copy first. */
function copyName(path: string, label: (name: string) => string) {
  const name = basename(path)
  const dot = name.lastIndexOf(".")
  return dot > 0
    ? `${label(name.slice(0, dot))}${name.slice(dot)}`
    : label(name)
}

export interface WorkspaceNotice {
  tone: "error" | "info"
  message: WorkspaceText
  retry?: () => void
}

export interface WorkspaceApi {
  registry: DocumentRegistry
  state: WorkspaceState
  folder: FolderState | null
  recents: RecentEntry[]
  notice: WorkspaceNotice | null
  /** The last save failure per document; describe it when shown. */
  saveErrors: Record<string, unknown>
  conflicts: Record<string, DiskConflict>
  /** Dismiss a conflict and go on editing; the next save asks again. */
  keepEditing(id: string): void
  /** Resolve a conflict by loading the disk version (undoable). Ask first. */
  reloadFromDisk(id: string): void
  /** Resolve a conflict by saving the buffer to a new path. */
  saveCopy(id: string): Promise<boolean>
  /** Routed commands each document supports, and whether they can run now. */
  commands: Record<string, DocumentCommandState>
  setCommands(id: string, commands: DocumentCommandState): void
  /** Runs a routed command in a document's editor. False when unsupported. */
  runCommand(id: string, command: DocumentCommand): boolean
  newDocument(typeId: string): void
  openPath(path: string): Promise<void>
  openFileDialog(): Promise<void>
  openFolderDialog(): Promise<void>
  openFolder(path: string): Promise<void>
  closeFolder(): void
  openRecent(entry: RecentEntry): Promise<void>
  activate(id: string): void
  close(id: string): void
  /** Close several documents at once, without asking about unsaved ones. */
  closeMany(ids: string[]): void
  setDirty(id: string, dirty: boolean): void
  save(id: string): Promise<boolean>
  saveAs(id: string): Promise<boolean>
  /** Exports to a destination the user picks. False when cancelled or failed. */
  exportDocument(id: string, format: ExportFormat): Promise<boolean>
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

export function WorkspaceProvider({
  registry,
  files,
  session,
  autoSave = false,
  children,
}: {
  registry: DocumentRegistry
  files: FileService
  session: SessionStore
  /**
   * Save documents that have a file shortly after the last edit. Uses the
   * normal save, so the on-disk version check still applies, and pauses for
   * a document with a conflict or a failed save until it is resolved.
   */
  autoSave?: boolean
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState)
  const [folder, setFolder] = useState<FolderState | null>(null)
  const [recents, setRecents] = useState<RecentEntry[]>(() =>
    session.loadRecents()
  )
  const [notice, setNotice] = useState<WorkspaceNotice | null>(null)
  const [saveErrors, setSaveErrors] = useState<Record<string, unknown>>({})
  const { locale } = useLocale()
  const [conflicts, setConflicts] = useState<Record<string, DiskConflict>>({})
  const [commands, setCommandsState] = useState<
    Record<string, DocumentCommandState>
  >({})
  const ownWrites = useRef(new Map<string, number>())
  const editors = useRef(new Map<string, DocumentEditorHandle>())
  const pendingFocus = useRef<string | null>(null)
  const stateRef = useRef(state)
  const folderRef = useRef(folder)
  const restored = useRef(false)
  const restoring = useRef(false)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveTimers = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  )
  const blocked = useRef({ saveErrors, conflicts })
  const extensions = useMemo(
    () => registry.list().flatMap((t) => t.extensions),
    [registry]
  )

  useLayoutEffect(() => {
    stateRef.current = state
    folderRef.current = folder
    blocked.current = { saveErrors, conflicts }
  }, [state, folder, saveErrors, conflicts])

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
          ? (editors.current.get(d.id)?.draft() ?? d.restoredDraft)
          : null,
        baseModifiedMs: d.modifiedMs,
        copyPending: d.copyPending,
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
      const empty = type.createEmpty()
      openDocument(
        {
          id: nextId(),
          typeId,
          title: nextTitle(
            type.defaultTitle[locale],
            stateRef.current.documents
          ),
          path: null,
          initial: empty,
          saved: empty,
          dirty: false,
          modifiedMs: null,
          copyPending: false,
          restoredDraft: null,
        },
        true
      )
    },
    [registry, openDocument, locale]
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
          tone: "error",
          message: (t) => t.unsupported(basename(path)),
        })
        return
      }
      try {
        const file = await files.readFile(path, type.maxBytes)
        // An unsupported file throws here, before any tab exists.
        const document = type.load(file.bytes)
        openDocument(
          {
            id: nextId(),
            typeId: type.id,
            title: basename(path),
            path,
            initial: document,
            saved: document,
            dirty: false,
            modifiedMs: file.modifiedMs,
            copyPending: type.save === "copy",
            restoredDraft: null,
          },
          true
        )
        rememberRecent({ path, kind: "file" })
      } catch (error) {
        setNotice({
          tone: "error",
          message: (t, describe) =>
            t.couldNotOpen(basename(path), describe(error)),
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
        setFolder({ path, status: "error", error })
      }
    },
    [files, extensions, rememberRecent]
  )

  const openFileDialog = useCallback(async () => {
    try {
      const path = await files.pickOpenFile(extensions)
      if (path) await openPath(path)
    } catch (error) {
      setNotice({
        tone: "error",
        message: (t, describe) => t.couldNotOpenFile(describe(error)),
      })
    }
  }, [files, extensions, openPath])

  const openFolderDialog = useCallback(async () => {
    try {
      const path = await files.pickFolder()
      if (path) await openFolder(path)
    } catch (error) {
      setNotice({
        tone: "error",
        message: (t, describe) => t.couldNotOpenFolder(describe(error)),
      })
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

  const forgetCommands = (ids: string[]) =>
    setCommandsState((current) => {
      if (!ids.some((id) => id in current)) return current
      const next = { ...current }
      for (const id of ids) delete next[id]
      return next
    })

  const clearConflict = (id: string) =>
    setConflicts((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })

  // Reads the disk version of a document into a conflict entry.
  const loadConflict = useCallback(
    async (id: string, path: string) => {
      const stat = await files.statFile(path).catch(() => null)
      if (!stat?.exists) {
        setConflicts((c) => ({
          ...c,
          [id]: { disk: null, modifiedMs: 0 },
        }))
        return
      }
      const typeId = stateRef.current.documents.find((d) => d.id === id)?.typeId
      const file = await files.readFile(
        path,
        typeId ? registry.get(typeId)?.maxBytes : undefined
      )
      setConflicts((c) => ({
        ...c,
        [id]: { disk: file.bytes, modifiedMs: file.modifiedMs },
      }))
    },
    [files, registry]
  )

  const writeDocument = useCallback(
    async (id: string, path: string, expectedModifiedMs: number | null) => {
      const editor = editors.current.get(id)
      if (!editor) return false
      let modifiedMs: number
      let token: unknown
      try {
        const serialized = await editor.serialize()
        token = serialized.token
        modifiedMs = await files.writeFile(
          path,
          serialized.bytes,
          expectedModifiedMs
        )
      } catch (error) {
        if (isConflict(error)) {
          await loadConflict(id, path)
        } else {
          setSaveErrors((errors) => ({ ...errors, [id]: error }))
        }
        return false
      }
      // Remember the new version before the watcher reports this write, so
      // the event is recognized as the app's own.
      ownWrites.current.set(path, modifiedMs)
      dispatch({ type: "modified", id, modifiedMs })
      editors.current.get(id)?.markSaved(token)
      clearError(id)
      clearConflict(id)
      const current = folderRef.current
      if (current && isInside(path, current.path))
        void openFolder(current.path, false)
      return true
    },
    [files, openFolder, loadConflict]
  )

  const saveAs = useCallback(
    async (id: string) => {
      const document = stateRef.current.documents.find((d) => d.id === id)
      const type = document && registry.get(document.typeId)
      if (!document || !type) return false
      const suggested = !document.path
        ? `${document.title}${type.extensions[0] ?? ""}`
        : document.copyPending
          ? copyName(document.path, workspaceMessages[locale].editedCopyName)
          : basename(document.path)
      let path: string | null
      try {
        path = await files.pickSavePath(suggested)
      } catch (error) {
        setSaveErrors((errors) => ({ ...errors, [id]: error }))
        return false
      }
      if (!path) return false
      const saved = await writeDocument(id, path, null)
      if (saved) {
        dispatch({ type: "rename", id, path, title: basename(path) })
        rememberRecent({ path, kind: "file" })
      }
      return saved
    },
    [files, registry, writeDocument, rememberRecent, locale]
  )

  const save = useCallback(
    async (id: string) => {
      const document = stateRef.current.documents.find((d) => d.id === id)
      if (!document) return false
      // A type that saves a copy first never writes over its source here.
      return document.path && !document.copyPending
        ? writeDocument(id, document.path, document.modifiedMs)
        : saveAs(id)
    },
    [writeDocument, saveAs]
  )

  // A watched file changed: ignore the app's own writes, reload clean tabs,
  // and turn dirty tabs into a conflict that keeps both versions.
  const handleExternalChange = useCallback(
    async (path: string) => {
      const document = stateRef.current.documents.find((d) => d.path === path)
      const editor = document && editors.current.get(document.id)
      if (!document || !editor) return
      const stat = await files.statFile(path).catch(() => null)
      const known = ownWrites.current.get(path) ?? document.modifiedMs
      if (stat?.exists && stat.modifiedMs === known) return
      if (!stat?.exists) {
        await loadConflict(document.id, path)
        return
      }
      const type = registry.get(document.typeId)
      const file = await files.readFile(path, type?.maxBytes).catch(() => null)
      if (!file) return
      const current = await editor.serialize().catch(() => null)
      if (current && sameBytes(file.bytes, current.bytes)) {
        ownWrites.current.set(path, file.modifiedMs)
        dispatch({
          type: "modified",
          id: document.id,
          modifiedMs: file.modifiedMs,
        })
        clearConflict(document.id)
        return
      }
      if (!document.dirty) {
        try {
          editor.replaceContent(file.bytes)
        } catch (error) {
          // The new version cannot be loaded: keep the tab as it was.
          setNotice({
            tone: "error",
            message: (t, describe) =>
              t.couldNotReload(document.title, describe(error)),
          })
          return
        }
        ownWrites.current.set(path, file.modifiedMs)
        dispatch({
          type: "modified",
          id: document.id,
          modifiedMs: file.modifiedMs,
        })
        setNotice({
          tone: "info",
          message: (t) => t.reloaded(document.title),
        })
        return
      }
      setConflicts((c) => ({
        ...c,
        [document.id]: {
          disk: file.bytes,
          modifiedMs: file.modifiedMs,
        },
      }))
    },
    [files, registry, loadConflict]
  )

  const handleChangeRef = useRef(handleExternalChange)
  useLayoutEffect(() => {
    handleChangeRef.current = handleExternalChange
  }, [handleExternalChange])

  useEffect(
    () => files.onFileChanged((path) => void handleChangeRef.current(path)),
    [files]
  )

  const watchKey = state.documents
    .map((d) => d.path)
    .filter((p): p is string => p !== null)
    .join("\n")
  useEffect(() => {
    void files.watchPaths(watchKey ? watchKey.split("\n") : []).catch(() => {})
  }, [files, watchKey])

  const reloadFromDisk = useCallback(
    (id: string) => {
      const conflict = conflicts[id]
      const editor = editors.current.get(id)
      const document = stateRef.current.documents.find((d) => d.id === id)
      if (!conflict || conflict.disk === null || !editor || !document) return
      try {
        editor.replaceContent(conflict.disk)
      } catch (error) {
        setNotice({
          tone: "error",
          message: (t, describe) =>
            t.couldNotReload(document.title, describe(error)),
        })
        return
      }
      if (document.path)
        ownWrites.current.set(document.path, conflict.modifiedMs)
      dispatch({ type: "modified", id, modifiedMs: conflict.modifiedMs })
      clearConflict(id)
    },
    [conflicts]
  )

  // Saving to a new path resolves the conflict; the file on disk stays as
  // the other program left it.
  const saveCopy = useCallback((id: string) => saveAs(id), [saveAs])

  const setCommands = useCallback(
    (id: string, next: DocumentCommandState) =>
      setCommandsState((current) => {
        const previous = current[id]
        const keys = Object.keys(next) as DocumentCommand[]
        if (
          previous &&
          keys.length === Object.keys(previous).length &&
          keys.every((key) => previous[key] === next[key])
        )
          return current
        return { ...current, [id]: next }
      }),
    []
  )

  const runCommand = useCallback(
    (id: string, command: DocumentCommand) =>
      editors.current.get(id)?.run(command) ?? false,
    []
  )

  const scheduleAutoSave = useCallback(
    (id: string) => {
      const timers = autoSaveTimers.current
      clearTimeout(timers.get(id))
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id)
          const document = stateRef.current.documents.find((d) => d.id === id)
          const { saveErrors, conflicts } = blocked.current
          if (!document?.path || !document.dirty) return
          // A failed save or a conflict waits for the user, so auto save
          // never retries in a loop or overwrites a newer disk version.
          if (id in saveErrors || id in conflicts) return
          void writeDocument(id, document.path, document.modifiedMs)
        }, AUTO_SAVE_DELAY_MS)
      )
    },
    [writeDocument]
  )

  // Turning auto save on saves what is already pending; turning it off
  // cancels pending saves.
  useEffect(() => {
    const timers = autoSaveTimers.current
    if (autoSave) {
      for (const document of stateRef.current.documents)
        if (document.dirty && document.path) scheduleAutoSave(document.id)
    }
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [autoSave, scheduleAutoSave])

  const noteEdit = useCallback(
    (id: string) => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
      draftTimer.current = setTimeout(persistSession, DRAFT_DELAY_MS)
      if (autoSave) scheduleAutoSave(id)
    },
    [persistSession, autoSave, scheduleAutoSave]
  )

  // Restore the previous session once: drafts come back unsaved against the
  // file on disk, clean files are read again.
  useEffect(() => {
    if (restoring.current) return
    restoring.current = true
    const previous = session.loadSession()
    void (async () => {
      const failures: { title: string; error: unknown }[] = []
      for (const saved of previous?.documents ?? []) {
        const type: DocumentType | undefined = registry.get(saved.typeId)
        if (!type) continue
        const number = /^doc-(\d+)$/.exec(saved.id)?.[1]
        if (number) sequence = Math.max(sequence, Number(number))
        let onDisk: {
          document: unknown
          bytes: Uint8Array
          modifiedMs: number
        } | null = null
        let missing = false
        if (saved.path) {
          try {
            const file = await files.readFile(saved.path, type.maxBytes)
            onDisk = {
              document: type.load(file.bytes),
              bytes: file.bytes,
              modifiedMs: file.modifiedMs,
            }
          } catch (error) {
            if (saved.draft === null) {
              failures.push({ title: saved.title, error })
              continue
            }
            missing = true
          }
        }
        const savedDocument = onDisk?.document ?? type.createEmpty()
        const changedSince =
          saved.draft !== null &&
          onDisk !== null &&
          saved.baseModifiedMs !== null &&
          onDisk.modifiedMs !== saved.baseModifiedMs
        openDocument(
          {
            id: saved.id,
            typeId: saved.typeId,
            title: saved.title,
            path: saved.path,
            initial:
              saved.draft === null
                ? savedDocument
                : type.fromDraft(saved.draft, savedDocument),
            saved: savedDocument,
            dirty: saved.draft !== null,
            // A draft made against an older version keeps that version, so
            // saving it cannot silently overwrite the newer file.
            modifiedMs: changedSince
              ? saved.baseModifiedMs
              : (onDisk?.modifiedMs ?? null),
            copyPending: saved.copyPending,
            restoredDraft: saved.draft,
          },
          false
        )
        if (changedSince && onDisk) {
          const disk = onDisk
          setConflicts((c) => ({
            ...c,
            [saved.id]: { disk: disk.bytes, modifiedMs: disk.modifiedMs },
          }))
        } else if (missing && saved.path) {
          setConflicts((c) => ({
            ...c,
            [saved.id]: { disk: null, modifiedMs: 0 },
          }))
        }
      }
      if (previous?.activeId)
        dispatch({ type: "activate", id: previous.activeId })
      if (previous?.folder) await openFolder(previous.folder, false)
      if (failures.length > 0) {
        setNotice({
          tone: "error",
          message: (t, describe) =>
            t.couldNotReopen(
              failures.map((f) => t.reopenItem(f.title, describe(f.error)))
            ),
        })
      }
      restored.current = true
      persistSession()
    })()
  }, [session, registry, files, openDocument, openFolder, persistSession])

  const resolveAsset = useCallback(
    async (id: string, src: string) => {
      const document = stateRef.current.documents.find((d) => d.id === id)
      if (!document?.path) {
        throw new FileError("unsaved", "Save the document to show local images")
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

  const exportDocument = useCallback(
    async (id: string, format: ExportFormat): Promise<boolean> => {
      const document = stateRef.current.documents.find((d) => d.id === id)
      const exporter = document && registry.get(document.typeId)?.exporter
      const editor = editors.current.get(id)
      if (!document || !exporter || !editor) return false
      const base = document.path
        ? basename(document.path).replace(/\.[^.]+$/, "")
        : document.title
      let path: string | null
      try {
        path = await files.pickExportPath(`${base}.${format}`, format)
      } catch (error) {
        setNotice({
          tone: "error",
          message: (t, describe) =>
            t.couldNotExport(document.title, describe(error)),
        })
        return false
      }
      if (!path) return false
      const name = basename(path)
      try {
        const { bytes } = await editor.serialize()
        const html = await exporter.toStandaloneHtml(bytes, {
          title: document.title,
          locale,
          resolveAsset: (src) => resolveAsset(id, src),
        })
        if (format === "pdf") {
          setNotice({ tone: "info", message: (t) => t.exporting(name) })
          await files.exportPdf(path, html)
        } else {
          await files.writeFile(path, new TextEncoder().encode(html), null)
        }
        setNotice({ tone: "info", message: (t) => t.exported(name) })
        return true
      } catch (error) {
        setNotice({
          tone: "error",
          message: (t, describe) => t.couldNotExport(name, describe(error)),
        })
        return false
      }
    },
    [files, registry, locale, resolveAsset]
  )

  const api = useMemo<WorkspaceApi>(
    () => ({
      registry,
      state,
      folder,
      recents,
      notice,
      saveErrors,
      conflicts,
      keepEditing: clearConflict,
      reloadFromDisk,
      saveCopy,
      commands,
      setCommands,
      runCommand,
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
        clearConflict(id)
        forgetCommands([id])
      },
      closeMany: (ids) => {
        dispatch({ type: "closeMany", ids })
        for (const id of ids) {
          clearError(id)
          clearConflict(id)
        }
        forgetCommands(ids)
      },
      setDirty: (id, dirty) => dispatch({ type: "dirty", id, dirty }),
      save,
      saveAs,
      exportDocument,
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
      conflicts,
      reloadFromDisk,
      saveCopy,
      commands,
      setCommands,
      runCommand,
      newDocument,
      openPath,
      openFileDialog,
      openFolderDialog,
      openFolder,
      openRecent,
      save,
      saveAs,
      exportDocument,
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
