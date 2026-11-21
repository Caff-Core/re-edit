import type { Locale } from "./locale"

/**
 * One module's strings in every shipped language. `en` defines the shape;
 * every other language must provide exactly the same keys, so a missing
 * translation fails the typecheck.
 */
export type Catalog<M> = { readonly en: M } & {
  readonly [L in Exclude<Locale, "en">]: NoInfer<M>
}

/** Declares a catalog; the identity function exists for its type check. */
export function defineMessages<M>(catalog: Catalog<M>): Catalog<M> {
  return catalog
}

/** A string in every shipped language, for data such as a document type. */
export type LocalizedText = Catalog<string>

/** Text that is resolved against the current language when rendered. */
export type Translatable<M> = (messages: M) => string
