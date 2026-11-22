import {
  DEFAULT_TEXT_FORMAT,
  decodeText,
  encodeText,
  type TextFormat,
} from "./text-codec"

/** A text document and how its file stores it. Shared by every text type. */
export interface TextDocument {
  /** The text with "\n" line endings. */
  text: string
  format: TextFormat
}

/**
 * The parts of a document type that every text format shares: decoding with
 * the codec (which refuses encodings it cannot keep), empty documents, and
 * drafts that keep the file's format.
 */
export const textDocuments = {
  load: (bytes: Uint8Array): TextDocument => decodeText(bytes),
  createEmpty: (): TextDocument => ({ text: "", format: DEFAULT_TEXT_FORMAT }),
  fromDraft: (draft: string, saved: TextDocument): TextDocument => ({
    text: draft,
    format: saved.format,
  }),
}

/**
 * A text editor's save: the file's bytes, and the text as the token, so the
 * editor stays dirty if the text changed while the save ran.
 */
export const serializeText = (text: string, format: TextFormat) => ({
  bytes: encodeText(text, format),
  token: text,
})
