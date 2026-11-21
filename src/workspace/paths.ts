/** File name of a path, for tab titles. Handles / and \\ separators. */
export function basename(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

/** True when `path` is `folder` or inside it. */
export function isInside(path: string, folder: string): boolean {
  const base = folder.replace(/[/\\]+$/, "")
  return (
    path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}\\`)
  )
}
