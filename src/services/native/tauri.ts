import { invoke } from "@tauri-apps/api/core"

import type {
  AppInfo,
  FolderListing,
  ImageData,
  NativeService,
  TextFile,
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
      throw new Error(String((error as { message: unknown }).message), {
        cause: error,
      })
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
  writeTextFile: (path, content) =>
    call<number>("write_text_file", { path, content }),
  listFolder: (path, extensions) =>
    call<FolderListing>("list_folder", { path, extensions }),
  readDocumentImage: (documentPath, src) =>
    call<ImageData>("read_document_image", { documentPath, src }),
}
