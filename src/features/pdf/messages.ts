import { defineMessages } from "@/lib/i18n"

/** PDF feature strings, including accessible names and announcements. */
export const pdfMessages = defineMessages({
  en: {
    loading: "Loading PDF",
    couldNotShow: "The PDF could not be shown.",
    retry: "Retry",
    tools: "Tool",
    select: "Select",
    highlight: "Highlight",
    comment: "Comment",
    textbox: "Text box",
    undo: "Undo",
    redo: "Redo",
    pageTools: "Page",
    rotateLeft: "Rotate left",
    rotateRight: "Rotate right",
    moveEarlier: "Move page earlier",
    moveLater: "Move page later",
    deletePage: "Delete page",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    zoom: (percent: number) => `${percent}%`,
    previousPage: "Previous page",
    nextPage: "Next page",
    pageOf: (n: number, total: number) => `Page ${n} of ${total}`,
    pages: "Pages",
    pageLabel: (n: number) => `Page ${n}`,
    railHelp:
      "Arrow keys choose a page. Alt with an arrow moves it, R rotates it, Delete removes it.",
    pageSurface: (n: number) => `Page ${n}`,
    surfaceHelp: (tool: string): string =>
      tool === "comment" || tool === "textbox"
        ? "Press Enter to add one in the middle of the page, or click where it goes."
        : tool === "highlight"
          ? "Drag across text to highlight it."
          : "Page Up and Page Down change the page.",
    moved: (n: number, position: number) =>
      `Page ${n} moved to position ${position}.`,
    rotated: (n: number, degrees: number) =>
      `Page ${n} rotated to ${degrees} degrees.`,
    deleted: (n: number) => `Page ${n} deleted.`,
    lastPage: "The last page cannot be deleted.",
    noText: "There is no selectable text there.",
    scannedPage:
      "This page has no selectable text. Add a text box or a comment instead.",
    added: (kind: string) => `${kind} added.`,
    removed: (kind: string) => `${kind} removed.`,
    highlightLabel: "Highlight",
    commentLabel: (text: string) => (text ? `Comment: ${text}` : "Comment"),
    textboxLabel: (text: string) => (text ? `Text box: ${text}` : "Text box"),
    annotationHelp:
      "Arrow keys move it, Shift with an arrow moves further, Enter edits the text, Delete removes it.",
    commentText: "Comment text",
    textboxText: "Text box text",
    newTextbox: "Text",
    fieldLabel: (name: string) => name,
    unsupportedField: (name: string) =>
      `${name}: this kind of field cannot be filled in the editor. Its value is kept.`,
    readOnlyField: (name: string) => `${name} is read-only.`,
    unsupportedHint: "Not supported",
  },
  "zh-CN": {
    loading: "正在载入 PDF",
    couldNotShow: "无法显示该 PDF。",
    retry: "重试",
    tools: "工具",
    select: "选择",
    highlight: "高亮",
    comment: "批注",
    textbox: "文本框",
    undo: "撤销",
    redo: "重做",
    pageTools: "页面",
    rotateLeft: "向左旋转",
    rotateRight: "向右旋转",
    moveEarlier: "页面前移",
    moveLater: "页面后移",
    deletePage: "删除页面",
    zoomOut: "缩小",
    zoomIn: "放大",
    zoom: (percent: number) => `${percent}%`,
    previousPage: "上一页",
    nextPage: "下一页",
    pageOf: (n: number, total: number) => `第 ${n} 页，共 ${total} 页`,
    pages: "页面",
    pageLabel: (n: number) => `第 ${n} 页`,
    railHelp:
      "方向键选择页面。按住 Alt 加方向键移动页面，R 旋转，Delete 删除。",
    pageSurface: (n: number) => `第 ${n} 页`,
    surfaceHelp: (tool: string): string =>
      tool === "comment" || tool === "textbox"
        ? "按 Enter 在页面中央添加，或点击要放置的位置。"
        : tool === "highlight"
          ? "在文字上拖动即可高亮。"
          : "Page Up 和 Page Down 切换页面。",
    moved: (n: number, position: number) =>
      `第 ${n} 页已移到第 ${position} 位。`,
    rotated: (n: number, degrees: number) =>
      `第 ${n} 页已旋转到 ${degrees} 度。`,
    deleted: (n: number) => `第 ${n} 页已删除。`,
    lastPage: "无法删除最后一页。",
    noText: "该处没有可选择的文字。",
    scannedPage: "此页面没有可选择的文字。请改用文本框或批注。",
    added: (kind: string) => `已添加${kind}。`,
    removed: (kind: string) => `已删除${kind}。`,
    highlightLabel: "高亮",
    commentLabel: (text: string) => (text ? `批注：${text}` : "批注"),
    textboxLabel: (text: string) => (text ? `文本框：${text}` : "文本框"),
    annotationHelp:
      "方向键移动，按住 Shift 移动更远，Enter 编辑文字，Delete 删除。",
    commentText: "批注文字",
    textboxText: "文本框文字",
    newTextbox: "文本",
    fieldLabel: (name: string) => name,
    unsupportedField: (name: string) =>
      `${name}：编辑器无法填写此类字段，其值将保持不变。`,
    readOnlyField: (name: string) => `${name} 为只读。`,
    unsupportedHint: "不支持",
  },
})

export type PdfMessages = (typeof pdfMessages)["en"]
