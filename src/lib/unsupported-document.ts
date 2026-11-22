/** Why a document type refused a file. Describe it in the reader's language when shown. */
export type UnsupportedReason =
  /** Text in an encoding the editor cannot keep intact. */
  | "encoding"
  /** The file is encrypted. */
  | "encrypted"
  /** The file is damaged or not the format its name says. */
  | "damaged"
  /** The format is valid but uses features the editor cannot change safely. */
  | "unsupported"

/**
 * Thrown by a document type that cannot open or reload a file without
 * changing or losing parts of it. The workspace opens no tab and shows the
 * reason instead.
 */
export class UnsupportedDocumentError extends Error {
  readonly reason: UnsupportedReason
  /** Extra detail for the message, such as the encoding that was found. */
  readonly detail: string | null

  constructor(reason: UnsupportedReason, detail: string | null = null) {
    super(detail ? `${reason}: ${detail}` : reason)
    this.name = "UnsupportedDocumentError"
    this.reason = reason
    this.detail = detail
  }
}
