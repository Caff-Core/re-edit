/** What the workspace restores after a restart. */
export interface SessionDocument {
  id: string
  typeId: string
  title: string
  path: string | null
  /** Unsaved work from the editor's `draft()`, or null when the document matched its file. */
  draft: string | null
  /**
   * Modification time of the disk version the draft was made against. When
   * the file differs after a restart, the draft comes back as a conflict.
   */
  baseModifiedMs: number | null
  /** The document still saves to a new copy first (see `OpenDocument.copyPending`). */
  copyPending: boolean
}

export interface Session {
  documents: SessionDocument[]
  activeId: string | null
  folder: string | null
}

export interface RecentEntry {
  path: string
  kind: "file" | "folder"
}

export interface SessionStore {
  loadSession(): Session | null
  saveSession(session: Session): void
  loadRecents(): RecentEntry[]
  saveRecents(recents: RecentEntry[]): void
}

export const MAX_RECENTS = 8

/** Moves `entry` to the front, without duplicates, keeping at most MAX_RECENTS. */
export function addRecent(
  recents: RecentEntry[],
  entry: RecentEntry
): RecentEntry[] {
  return [entry, ...recents.filter((r) => r.path !== entry.path)].slice(
    0,
    MAX_RECENTS
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Parses a stored session, dropping anything malformed. */
export function parseSession(raw: string | null): Session | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value) || !Array.isArray(value.documents)) return null
  const documents = value.documents
    .filter(
      (
        d
      ): d is Omit<SessionDocument, "baseModifiedMs" | "copyPending"> &
        Record<string, unknown> =>
        isRecord(d) &&
        typeof d.id === "string" &&
        typeof d.typeId === "string" &&
        typeof d.title === "string" &&
        (d.path === null || typeof d.path === "string") &&
        (d.draft === null || typeof d.draft === "string")
    )
    // Sessions from before 006 lack the last two fields.
    .map((d): SessionDocument => ({
      id: d.id,
      typeId: d.typeId,
      title: d.title,
      path: d.path,
      draft: d.draft,
      baseModifiedMs:
        typeof d.baseModifiedMs === "number" ? d.baseModifiedMs : null,
      copyPending: d.copyPending === true,
    }))
  return {
    documents,
    activeId: typeof value.activeId === "string" ? value.activeId : null,
    folder: typeof value.folder === "string" ? value.folder : null,
  }
}

export function parseRecents(raw: string | null): RecentEntry[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value
      .filter(
        (r): r is RecentEntry =>
          isRecord(r) &&
          typeof r.path === "string" &&
          (r.kind === "file" || r.kind === "folder")
      )
      .slice(0, MAX_RECENTS)
  } catch {
    return []
  }
}

const SESSION_KEY = "re-edit.session"
const RECENTS_KEY = "re-edit.recents"

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable: recovery is best effort.
  }
}

/** Session and recents in the web view's local storage (kept in the app data folder). */
export const localSessionStore: SessionStore = {
  loadSession: () => parseSession(read(SESSION_KEY)),
  saveSession: (session) => write(SESSION_KEY, session),
  loadRecents: () => parseRecents(read(RECENTS_KEY)),
  saveRecents: (recents) => write(RECENTS_KEY, recents),
}

export class MemorySessionStore implements SessionStore {
  session: Session | null = null
  recents: RecentEntry[] = []
  loadSession = () => this.session
  saveSession = (session: Session) => {
    this.session = structuredClone(session)
  }
  loadRecents = () => this.recents
  saveRecents = (recents: RecentEntry[]) => {
    this.recents = [...recents]
  }
}
