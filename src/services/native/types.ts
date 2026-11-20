/**
 * Contract for every operation the frontend requests from the desktop host.
 * Shapes mirror the Rust types in `src-tauri/src/native`.
 */
export interface AppInfo {
  name: string
  version: string
  platform: string
}

export interface NativeService {
  /** True when running inside the Tauri shell, false in a plain browser. */
  readonly isDesktop: boolean
  appInfo(): Promise<AppInfo>
}
