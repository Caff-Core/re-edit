import type { NativeService } from "./types"

/** Fallback used by `bun run dev` in a browser, where no host exists. */
export const browserNativeService: NativeService = {
  isDesktop: false,
  appInfo: async () => ({
    name: "re-edit",
    version: "dev",
    platform: "browser",
  }),
}
