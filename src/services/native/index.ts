import { isTauri } from "@tauri-apps/api/core"

import { browserNativeService } from "./browser"
import { tauriNativeService } from "./tauri"
import type { NativeService } from "./types"

export { FileError, isConflict } from "./types"
export type {
  AppInfo,
  FileService,
  FileErrorKind,
  FileStat,
  FolderEntry,
  FolderListing,
  ImageData,
  NativeService,
  TextFile,
} from "./types"

export const nativeService: NativeService = isTauri()
  ? tauriNativeService
  : browserNativeService
