import { defineMessages } from "@/lib/i18n"
import type { LineEnding, TextEncoding } from "@/lib/text-codec"

const ENCODINGS: Record<TextEncoding, string> = {
  "utf-8": "UTF-8",
  "utf-16le": "UTF-16 LE",
  "utf-16be": "UTF-16 BE",
}
const ENDINGS: Record<LineEnding, string> = {
  "\n": "LF",
  "\r\n": "CRLF",
  "\r": "CR",
}

export const plainTextMessages = defineMessages({
  en: {
    surface: (title: string) => `${title}, plain text`,
    placeholder: "Start typing",
    counts: (words: number, characters: number) =>
      `${words} ${words === 1 ? "word" : "words"}, ${characters} ${characters === 1 ? "character" : "characters"}`,
    format: (encoding: TextEncoding, bom: boolean, ending: LineEnding) =>
      `${ENCODINGS[encoding]}${bom && encoding === "utf-8" ? " with BOM" : ""}, ${ENDINGS[ending]}`,
    status: "Document status",
    mixedEndings: (ending: LineEnding) =>
      `This file mixes line endings. Saving writes ${ENDINGS[ending]} on every line.`,
    dismiss: "Dismiss",
  },
  "zh-CN": {
    surface: (title: string) => `${title}，纯文本`,
    placeholder: "开始输入",
    counts: (words: number, characters: number) =>
      `${words} 个词，${characters} 个字符`,
    format: (encoding: TextEncoding, bom: boolean, ending: LineEnding) =>
      `${ENCODINGS[encoding]}${bom && encoding === "utf-8" ? "（带 BOM）" : ""}，${ENDINGS[ending]}`,
    status: "文档状态",
    mixedEndings: (ending: LineEnding) =>
      `此文件混用了多种换行符。保存时每一行都将使用 ${ENDINGS[ending]}。`,
    dismiss: "关闭",
  },
})
