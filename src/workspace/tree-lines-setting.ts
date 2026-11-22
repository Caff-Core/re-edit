import { createStoredBoolean } from "@/lib/stored-setting"

export const TREE_LINES_STORAGE_KEY = "folderTreeLines"

/** Whether the folder tree shows branch lines (on by default). */
export const useTreeLinesSetting = createStoredBoolean(
  TREE_LINES_STORAGE_KEY,
  true
)
