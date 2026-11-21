import type { NativeService } from "./types"

const unavailable = () =>
  Promise.reject(new Error("Files are available in the desktop app"))

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
  readTextFile: unavailable,
  writeTextFile: unavailable,
  listFolder: unavailable,
}
