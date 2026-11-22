import { isTauri } from "@tauri-apps/api/core"

import { browserNativeService } from "./browser"
import { tauriNativeService } from "./tauri"
import type { NativeService } from "./types"

export { describeError, useDescribeError } from "./errors"
export type { FileErrorMessages } from "./errors"
export { FileError, isConflict } from "./types"
export type {
  AppInfo,
  AppWindow,
  ExportFormat,
  FileService,
  FileErrorKind,
  FileStat,
  FolderEntry,
  FolderListing,
  ImageData,
  NativeService,
  DocumentFile,
} from "./types"

export const nativeService: NativeService = isTauri()
  ? tauriNativeService
  : browserNativeService
