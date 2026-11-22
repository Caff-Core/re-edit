import {
  invoke,
  type InvokeArgs,
  type InvokeOptions,
} from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"

import {
  FileError,
  type AppInfo,
  type AppWindow,
  type FileErrorKind,
  type FileStat,
  type FolderListing,
  type ImageData,
  type NativeService,
  type DocumentFile,
} from "./types"

/** Rust FileError arrives as { kind, message }; surface it as an Error. */
async function call<T>(
  command: string,
  args?: InvokeArgs,
  options?: InvokeOptions
): Promise<T> {
  try {
    if (args === undefined) return await invoke<T>(command)
    if (options === undefined) return await invoke<T>(command, args)
    return await invoke<T>(command, args, options)
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

/** `read_file` sends the modification time (8 bytes, little endian), then the file. */
export function unframe(buffer: ArrayBuffer): DocumentFile {
  const modifiedMs = Number(new DataView(buffer).getBigUint64(0, true))
  return { modifiedMs, bytes: new Uint8Array(buffer, 8) }
}

/** Turns an async subscription into a synchronous stop function. */
function subscribe(start: Promise<UnlistenFn>): () => void {
  let stop: UnlistenFn | null = null
  let stopped = false
  void start.then((unlisten) => {
    if (stopped) unlisten()
    else stop = unlisten
  })
  return () => {
    stopped = true
    stop?.()
  }
}

const appWindow: AppWindow = {
  minimize: () => getCurrentWindow().minimize(),
  toggleMaximize: () => getCurrentWindow().toggleMaximize(),
  close: () => getCurrentWindow().close(),
  isMaximized: () => getCurrentWindow().isMaximized(),
  onResized: (listener) =>
    subscribe(getCurrentWindow().onResized(() => listener())),
}

export const tauriNativeService: NativeService = {
  isDesktop: true,
  appInfo: () => call<AppInfo>("app_info"),
  pickOpenFile: (extensions) =>
    call<string | null>("pick_open_file", { extensions }),
  pickFolder: () => call<string | null>("pick_folder"),
  pickSavePath: (suggestedName) =>
    call<string | null>("pick_save_path", { suggestedName }),
  pickExportPath: (suggestedName, format) =>
    call<string | null>("pick_export_path", { suggestedName, format }),
  exportPdf: (path, html) => call<number>("export_pdf", { path, html }),
  readFile: async (path, maxBytes) =>
    unframe(await call<ArrayBuffer>("read_file", { path, maxBytes })),
  // Raw body: the bytes never pass through JSON.
  writeFile: (path, bytes, expectedModifiedMs = null) =>
    call<number>("write_file", bytes, {
      headers: {
        "x-path": encodeURIComponent(path),
        ...(expectedModifiedMs === null
          ? {}
          : { "x-expected-modified-ms": String(expectedModifiedMs) }),
      },
    }),
  statFile: (path) => call<FileStat>("stat_file", { path }),
  watchPaths: (paths) => call<void>("watch_paths", { paths }),
  onFileChanged: (listener) =>
    subscribe(
      listen<string>("file-changed", (event) => listener(event.payload))
    ),
  listFolder: (path, extensions) =>
    call<FolderListing>("list_folder", { path, extensions }),
  readDocumentImage: (documentPath, src) =>
    call<ImageData>("read_document_image", { documentPath, src }),
  window: appWindow,
}
