import { UnsupportedDocumentError } from "./unsupported-document"

export type TextEncoding = "utf-8" | "utf-16le" | "utf-16be"
export type LineEnding = "\n" | "\r\n" | "\r"

/** How a text file is stored, so saving writes it back the same way. */
export interface TextFormat {
  encoding: TextEncoding
  /** True when the file starts with a byte order mark. Always true for UTF-16. */
  bom: boolean
  /** The line ending the file uses most; new and edited lines get it too. */
  lineEnding: LineEnding
  /** True when the file mixed line endings; saving writes `lineEnding` everywhere. */
  mixedLineEndings: boolean
}

export interface DecodedText {
  /** The text with every line ending as "\n", as CodeMirror keeps it. */
  text: string
  format: TextFormat
}

/** New documents: UTF-8 without a byte order mark, Unix line endings. */
export const DEFAULT_TEXT_FORMAT: TextFormat = {
  encoding: "utf-8",
  bom: false,
  lineEnding: "\n",
  mixedLineEndings: false,
}

const startsWith = (bytes: Uint8Array, prefix: number[]) =>
  prefix.every((b, i) => bytes[i] === b)

function decodeStrict(label: string, bytes: Uint8Array, what: string) {
  try {
    return new TextDecoder(label, { fatal: true, ignoreBOM: true }).decode(
      bytes
    )
  } catch {
    throw new UnsupportedDocumentError("encoding", what)
  }
}

function lineEndings(text: string) {
  let crlf = 0
  let cr = 0
  let lf = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c === 13) {
      if (text.charCodeAt(i + 1) === 10) {
        crlf++
        i++
      } else cr++
    } else if (c === 10) lf++
  }
  const kinds = [crlf, cr, lf].filter((n) => n > 0).length
  // Ties and files without line breaks fall back to "\n".
  const lineEnding: LineEnding =
    crlf > lf && crlf >= cr ? "\r\n" : cr > lf && cr > crlf ? "\r" : "\n"
  return { lineEnding, mixed: kinds > 1 }
}

/**
 * Decodes a text file without ever replacing characters. UTF-8 (with or
 * without a byte order mark) and UTF-16 with a byte order mark are kept;
 * anything else throws an UnsupportedDocumentError with reason "encoding".
 */
export function decodeText(bytes: Uint8Array): DecodedText {
  let encoding: TextEncoding = "utf-8"
  let bom = false
  let raw: string
  if (
    startsWith(bytes, [0xff, 0xfe, 0x00, 0x00]) ||
    startsWith(bytes, [0x00, 0x00, 0xfe, 0xff])
  ) {
    throw new UnsupportedDocumentError("encoding", "UTF-32")
  } else if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
    bom = true
    raw = decodeStrict("utf-8", bytes.subarray(3), "invalid UTF-8")
  } else if (startsWith(bytes, [0xff, 0xfe])) {
    encoding = "utf-16le"
    bom = true
    raw = decodeStrict("utf-16le", bytes.subarray(2), "invalid UTF-16")
  } else if (startsWith(bytes, [0xfe, 0xff])) {
    encoding = "utf-16be"
    bom = true
    raw = decodeStrict("utf-16be", bytes.subarray(2), "invalid UTF-16")
  } else {
    raw = decodeStrict(
      "utf-8",
      bytes,
      "not UTF-8; possibly Windows-1252, Latin-1, or another legacy encoding"
    )
  }
  const { lineEnding, mixed } = lineEndings(raw)
  return {
    text: raw.replace(/\r\n?/g, "\n"),
    format: { encoding, bom, lineEnding, mixedLineEndings: mixed },
  }
}

function utf16(text: string, littleEndian: boolean) {
  const out = new Uint8Array(text.length * 2)
  const view = new DataView(out.buffer)
  for (let i = 0; i < text.length; i++)
    view.setUint16(i * 2, text.charCodeAt(i), littleEndian)
  return out
}

/** Encodes `text` ("\n" line endings) back into the file's own format. */
export function encodeText(text: string, format: TextFormat): Uint8Array {
  const lines =
    format.lineEnding === "\n" ? text : text.replace(/\n/g, format.lineEnding)
  let body: Uint8Array
  let mark: number[] = []
  switch (format.encoding) {
    case "utf-8":
      body = new TextEncoder().encode(lines)
      if (format.bom) mark = [0xef, 0xbb, 0xbf]
      break
    case "utf-16le":
      body = utf16(lines, true)
      mark = [0xff, 0xfe]
      break
    case "utf-16be":
      body = utf16(lines, false)
      mark = [0xfe, 0xff]
      break
  }
  if (mark.length === 0) return body
  const out = new Uint8Array(mark.length + body.length)
  out.set(mark)
  out.set(body, mark.length)
  return out
}
