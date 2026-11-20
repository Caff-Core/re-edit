import { invoke } from "@tauri-apps/api/core"

import type { AppInfo, NativeService } from "./types"

export const tauriNativeService: NativeService = {
  isDesktop: true,
  appInfo: () => invoke<AppInfo>("app_info"),
}
