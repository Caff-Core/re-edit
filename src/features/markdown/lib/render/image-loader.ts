/**
 * Loader for preview images that resolves each source once. One loader is
 * created per document location, so moving the document starts fresh.
 * Failures are cached too, so a missing image is not retried on every
 * keystroke; reopening the preview creates a new loader.
 */
export function createImageLoader(
  documentPath: string | null,
  resolve: (src: string) => Promise<string>
) {
  const cache = new Map<string, Promise<string>>()
  return (src: string) => {
    const key = `${documentPath ?? ""}\n${src}`
    let pending = cache.get(key)
    if (!pending) {
      pending = resolve(src)
      cache.set(key, pending)
    }
    return pending
  }
}
