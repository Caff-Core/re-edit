import { defineMessages } from "@/lib/i18n"

/**
 * CodeMirror's built-in panel strings (find, replace, go to line), keyed by
 * CodeMirror's phrase IDs. Every CodeMirror editor in the app uses these.
 */
export const codemirrorPhrases = defineMessages<Record<string, string>>({
  en: {
    Find: "Find",
    Replace: "Replace",
    next: "Next",
    previous: "Previous",
    all: "Select all",
    "match case": "Match case",
    regexp: "Regular expression",
    "by word": "Whole word",
    replace: "Replace",
    "replace all": "Replace all",
    close: "Close",
    "current match": "Current match",
    "on line": "on line",
    "replaced $ matches": "Replaced $ matches",
    "replaced match on line $": "Replaced match on line $",
    "Go to line": "Go to line",
    go: "Go",
  },
  "zh-CN": {
    Find: "查找",
    Replace: "替换",
    next: "下一个",
    previous: "上一个",
    all: "全部选中",
    "match case": "区分大小写",
    regexp: "正则表达式",
    "by word": "全字匹配",
    replace: "替换",
    "replace all": "全部替换",
    close: "关闭",
    "current match": "当前匹配",
    "on line": "位于行",
    "replaced $ matches": "已替换 $ 处匹配",
    "replaced match on line $": "已替换第 $ 行的匹配",
    "Go to line": "跳转到行",
    go: "跳转",
  },
})
