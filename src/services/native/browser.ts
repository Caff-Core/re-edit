import { FileError, type NativeService } from "./types"

const unavailable = () =>
  Promise.reject(
    new FileError("unavailable", "Files are available in the desktop app")
  )

/** Fallback used by `bun run dev` in a browser, where no host exists. */
export const browserNativeService: NativeService = {
  isDesktop: false,
  appInfo: async () => ({
    name: "re-edit",
    version: "dev",
    platform: "browser",
  }),
  pickOpenFile: unavailable,
  pickFolder: unavailable,
  pickSavePath: unavailable,
  pickExportPath: unavailable,
  exportPdf: unavailable,
  readFile: unavailable,
  writeFile: unavailable,
  listFolder: unavailable,
  readDocumentImage: unavailable,
  statFile: unavailable,
  watchPaths: async () => {},
  onFileChanged: () => () => {},
  window: null,
}
