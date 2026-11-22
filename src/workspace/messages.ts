import { defineMessages } from "@/lib/i18n"

/** Workspace strings: menus, notices, conflicts, and the folder panel. */
export const workspaceMessages = defineMessages({
  en: {
    loadingEditor: "Loading editor",
    file: "File",
    newDocument: (label: string) => `New ${label}`,
    openFileMenu: "Open file…",
    openFolderMenu: "Open folder…",
    openRecent: "Open recent",
    save: "Save",
    saveWithShortcut: (label: string, shortcut: string) =>
      `${label} (${shortcut})`,
    saveAsMenu: "Save as…",
    exportHtml: "Export as HTML…",
    exportPdf: "Export as PDF…",
    exporting: (name: string) => `Exporting ${name}…`,
    exported: (name: string) => `Exported ${name}.`,
    couldNotExport: (name: string, reason: string) =>
      `Could not export ${name}: ${reason}`,
    somethingWentWrong: "Something went wrong",
    retry: "Retry",
    dismiss: "Dismiss",
    noDocumentTitle: "No document open",
    noDocumentDescription:
      "Start a new document, or open a file or folder from disk.",
    openFile: "Open file",
    openFolder: "Open folder",
    recent: "Recent",
    notSaved: (title: string) => `${title} was not saved`,
    deletedOnDisk: (title: string) => `${title} was deleted on disk`,
    changedOnDisk: (title: string) => `${title} changed on disk`,
    deletedHelp: "Your work is kept. Save a copy to write it to disk again.",
    changedHelp:
      "Your unsaved edits are kept. Keep editing, reload the version on disk (you can undo it), or save yours as a copy.",
    reload: "Reload…",
    reloadTitle: (title: string) => `Reload ${title} from disk?`,
    reloadDescription:
      "The version on disk replaces your unsaved edits. You can undo the reload.",
    reloadConfirm: "Reload",
    saveCopy: "Save a copy…",
    editedCopyName: (name: string) => `${name} (edited)`,
    couldNotReload: (title: string, reason: string) =>
      `Could not reload ${title}: ${reason}`,
    undo: "Undo",
    redo: "Redo",
    find: "Find",
    formatDocument: "Format document",
    discardTitle: (title: string) => `Discard changes to ${title}?`,
    discardDescription:
      "Closing this document loses the changes made since it was last saved.",
    discardManyTitle: (count: number) =>
      `Discard changes to ${count} documents?`,
    discardManyDescription:
      "Closing these documents loses the changes made since they were last saved.",
    keepEditing: "Keep editing",
    discardAndClose: "Discard and close",
    unsupported: (name: string) => `${name} is not a supported document type.`,
    couldNotOpen: (name: string, reason: string) =>
      `Could not open ${name}: ${reason}`,
    couldNotOpenFile: (reason: string) => `Could not open a file: ${reason}`,
    couldNotOpenFolder: (reason: string) =>
      `Could not open a folder: ${reason}`,
    reloaded: (title: string) =>
      `Reloaded ${title} because it changed on disk.`,
    couldNotReopen: (items: string[]) =>
      `Could not reopen ${items.join(", ")}.`,
    reopenItem: (title: string, reason: string) => `${title} (${reason})`,
    folderLabel: (name: string) => `Folder ${name}`,
    filesIn: (name: string) => `Files in ${name}`,
    refreshFolder: "Refresh folder",
    closeFolder: "Close folder",
    loadingFolder: "Loading folder",
    folderUnreadable: "Folder could not be read",
    noDocumentsHere: "No documents here",
    noDocumentsHelp: "This folder has no files the editor can open.",
    openAnotherFolder: "Open another folder",
    folderTruncated: "This folder is large; some files are not listed.",
  },
  "zh-CN": {
    loadingEditor: "正在加载编辑器",
    file: "文件",
    newDocument: (label: string) => `新建 ${label}`,
    openFileMenu: "打开文件…",
    openFolderMenu: "打开文件夹…",
    openRecent: "最近打开",
    save: "保存",
    saveWithShortcut: (label: string, shortcut: string) =>
      `${label}（${shortcut}）`,
    saveAsMenu: "另存为…",
    exportHtml: "导出为 HTML…",
    exportPdf: "导出为 PDF…",
    exporting: (name: string) => `正在导出 ${name}…`,
    exported: (name: string) => `已导出 ${name}。`,
    couldNotExport: (name: string, reason: string) =>
      `无法导出 ${name}：${reason}`,
    somethingWentWrong: "出现问题",
    retry: "重试",
    dismiss: "关闭",
    noDocumentTitle: "没有打开的文档",
    noDocumentDescription: "新建一个文档，或从磁盘打开文件或文件夹。",
    openFile: "打开文件",
    openFolder: "打开文件夹",
    recent: "最近打开",
    notSaved: (title: string) => `${title} 未保存`,
    deletedOnDisk: (title: string) => `${title} 已在磁盘上被删除`,
    changedOnDisk: (title: string) => `${title} 已在磁盘上被修改`,
    deletedHelp: "你的内容已保留。另存一份副本即可重新写入磁盘。",
    changedHelp:
      "你未保存的修改已保留。可以继续编辑、重新载入磁盘上的版本（可撤销），或将你的版本另存为副本。",
    reload: "重新载入…",
    reloadTitle: (title: string) => `从磁盘重新载入 ${title}？`,
    reloadDescription: "磁盘上的版本将替换你未保存的修改。重新载入可以撤销。",
    reloadConfirm: "重新载入",
    saveCopy: "另存副本…",
    editedCopyName: (name: string) => `${name}（已编辑）`,
    couldNotReload: (title: string, reason: string) =>
      `无法重新载入 ${title}：${reason}`,
    undo: "撤销",
    redo: "重做",
    find: "查找",
    formatDocument: "格式化文档",
    discardTitle: (title: string) => `放弃对 ${title} 的修改？`,
    discardDescription: "关闭此文档将丢失自上次保存以来的修改。",
    discardManyTitle: (count: number) => `放弃对 ${count} 个文档的修改？`,
    discardManyDescription: "关闭这些文档将丢失自上次保存以来的修改。",
    keepEditing: "继续编辑",
    discardAndClose: "放弃并关闭",
    unsupported: (name: string) => `${name} 不是支持的文档类型。`,
    couldNotOpen: (name: string, reason: string) =>
      `无法打开 ${name}：${reason}`,
    couldNotOpenFile: (reason: string) => `无法打开文件：${reason}`,
    couldNotOpenFolder: (reason: string) => `无法打开文件夹：${reason}`,
    reloaded: (title: string) => `${title} 已在磁盘上被修改，已重新载入。`,
    couldNotReopen: (items: string[]) => `无法重新打开：${items.join("、")}。`,
    reopenItem: (title: string, reason: string) => `${title}（${reason}）`,
    folderLabel: (name: string) => `文件夹 ${name}`,
    filesIn: (name: string) => `${name} 中的文件`,
    refreshFolder: "刷新文件夹",
    closeFolder: "关闭文件夹",
    loadingFolder: "正在加载文件夹",
    folderUnreadable: "无法读取文件夹",
    noDocumentsHere: "这里没有文档",
    noDocumentsHelp: "此文件夹中没有编辑器可以打开的文件。",
    openAnotherFolder: "打开其他文件夹",
    folderTruncated: "此文件夹过大，部分文件未列出。",
  },
})

export type WorkspaceMessages = (typeof workspaceMessages)["en"]

/**
 * Text resolved when it is shown, so a notice follows a language change.
 * `describe` turns an error into readable text in the same language.
 */
export type WorkspaceText = (
  t: WorkspaceMessages,
  describe: (error: unknown) => string
) => string
