import { describe, expect, it } from "vitest"

import { decodeText, encodeText } from "./text-codec"
import { UnsupportedDocumentError } from "./unsupported-document"

const utf8 = (s: string) => new TextEncoder().encode(s)
const bytes = (...parts: (number[] | Uint8Array)[]) =>
  Uint8Array.from(parts.flatMap((p) => [...p]))

function utf16(text: string, le: boolean) {
  const out = new Uint8Array(text.length * 2)
  for (let i = 0; i < text.length; i++)
    new DataView(out.buffer).setUint16(i * 2, text.charCodeAt(i), le)
  return out
}

describe("AC-012: text codec", () => {
  it("round-trips UTF-8 with a byte order mark and Windows line endings", () => {
    const file = bytes([0xef, 0xbb, 0xbf], utf8("Grüße\r\n中文 ✓\r\nend\r\n"))
    const { text, format } = decodeText(file)
    expect(text).toBe("Grüße\n中文 ✓\nend\n")
    expect(format).toEqual({
      encoding: "utf-8",
      bom: true,
      lineEnding: "\r\n",
      mixedLineEndings: false,
    })
    expect(encodeText(text, format)).toEqual(file)
  })

  it("changes only the edited bytes", () => {
    const file = bytes([0xef, 0xbb, 0xbf], utf8("one\r\ntwo\r\nthree\r\n"))
    const { text, format } = decodeText(file)
    const saved = encodeText(text.replace("two", "2"), format)
    expect(saved).toEqual(
      bytes([0xef, 0xbb, 0xbf], utf8("one\r\n2\r\nthree\r\n"))
    )
  })

  it("round-trips plain UTF-8 with Unix line endings and no final newline", () => {
    const file = utf8("é\nlast")
    const { text, format } = decodeText(file)
    expect(format.bom).toBe(false)
    expect(format.lineEnding).toBe("\n")
    expect(encodeText(text, format)).toEqual(file)
  })

  it.each([
    ["little endian", true, [0xff, 0xfe], "utf-16le"],
    ["big endian", false, [0xfe, 0xff], "utf-16be"],
  ] as const)(
    "round-trips UTF-16 %s with its byte order mark",
    (_, le, mark, encoding) => {
      const file = bytes([...mark], utf16("Hi 😀\r\n中\r\n", le))
      const { text, format } = decodeText(file)
      expect(text).toBe("Hi 😀\n中\n")
      expect(format.encoding).toBe(encoding)
      expect(encodeText(text, format)).toEqual(file)
    }
  )

  it("keeps old Mac line endings", () => {
    const file = utf8("a\rb\r")
    const { format, text } = decodeText(file)
    expect(format.lineEnding).toBe("\r")
    expect(encodeText(text, format)).toEqual(file)
  })

  it("reports mixed line endings and writes the dominant one", () => {
    const { text, format } = decodeText(utf8("a\r\nb\r\nc\nd"))
    expect(format.mixedLineEndings).toBe(true)
    expect(format.lineEnding).toBe("\r\n")
    expect(encodeText(text, format)).toEqual(utf8("a\r\nb\r\nc\r\nd"))
  })

  it("refuses Windows-1252 instead of replacing characters", () => {
    // "café" in Windows-1252: 0xE9 alone is not valid UTF-8.
    const attempt = () => decodeText(Uint8Array.from([0x63, 0x61, 0x66, 0xe9]))
    expect(attempt).toThrow(UnsupportedDocumentError)
    try {
      attempt()
    } catch (error) {
      expect((error as UnsupportedDocumentError).reason).toBe("encoding")
    }
  })

  it("refuses UTF-32 and broken UTF-16", () => {
    expect(() =>
      decodeText(Uint8Array.from([0xff, 0xfe, 0, 0, 0x41, 0, 0, 0]))
    ).toThrow(UnsupportedDocumentError)
    // A lone high surrogate.
    expect(() => decodeText(Uint8Array.from([0xff, 0xfe, 0x3d, 0xd8]))).toThrow(
      UnsupportedDocumentError
    )
  })

  it("decodes an empty file as empty UTF-8", () => {
    const { text, format } = decodeText(new Uint8Array())
    expect(text).toBe("")
    expect([...encodeText(text, format)]).toEqual([])
  })
})
