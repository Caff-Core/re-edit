import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

import {
  FileError,
  type AppInfo,
  type FileErrorKind,
  type FileStat,
  type FolderListing,
  type ImageData,
  type NativeService,
  type TextFile,
} from "./types"

/** Rust FileError arrives as { kind, message }; surface it as an Error. */
async function call<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await (args === undefined
      ? invoke<T>(command)
      : invoke<T>(command, args))
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      const { kind, message } = error as { kind?: unknown; message: unknown }
      throw new FileError(
        (typeof kind === "string" ? kind : "io") as FileErrorKind,
        String(message),
        { cause: error }
      )
    }
    throw new Error(String(error), { cause: error })
  }
}

export const tauriNativeService: NativeService = {
  isDesktop: true,
  appInfo: () => call<AppInfo>("app_info"),
  pickOpenFile: (extensions) =>
    call<string | null>("pick_open_file", { extensions }),
  pickFolder: () => call<string | null>("pick_folder"),
  pickSavePath: (suggestedName) =>
    call<string | null>("pick_save_path", { suggestedName }),
  readTextFile: (path) => call<TextFile>("read_text_file", { path }),
  writeTextFile: (path, content, expectedModifiedMs = null) =>
    call<number>("write_text_file", { path, content, expectedModifiedMs }),
  statFile: (path) => call<FileStat>("stat_file", { path }),
  watchPaths: (paths) => call<void>("watch_paths", { paths }),
  onFileChanged: (listener) => {
    let stop: (() => void) | null = null
    let stopped = false
    void listen<string>("file-changed", (event) =>
      listener(event.payload)
    ).then((unlisten) => {
      if (stopped) unlisten()
      else stop = unlisten
    })
    return () => {
      stopped = true
      stop?.()
    }
  },
  listFolder: (path, extensions) =>
    call<FolderListing>("list_folder", { path, extensions }),
  readDocumentImage: (documentPath, src) =>
    call<ImageData>("read_document_image", { documentPath, src }),
}
