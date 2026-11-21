import { hotkeysCoreFeature, syncDataLoaderFeature } from "@headless-tree/core"
import { useTree } from "@headless-tree/react"
import { FileTextIcon, FolderIcon, FolderOpenIcon } from "lucide-react"
import { useEffect, useMemo } from "react"

import { Tree, TreeItem, TreeItemLabel } from "@/components/reui/tree"

export interface FileTreeEntry {
  /** Unique id, for example the absolute path. */
  id: string
  name: string
  parentId: string
  kind: "file" | "folder"
}

export interface FileTreeProps {
  rootId: string
  rootName: string
  entries: FileTreeEntry[]
  /** Id of the file shown in the active tab, highlighted in the tree. */
  activeId: string | null
  onOpenFile: (id: string) => void
  label: string
}

interface Node {
  name: string
  kind: "file" | "folder"
  children: string[]
}

const INDENT = 16

/**
 * Folder and file explorer on the ReUI tree (headless-tree). Click or Enter
 * opens a file; arrow keys move and expand. Feature-neutral: entries are
 * plain data and opening is a callback.
 */
export function FileTree({
  rootId,
  rootName,
  entries,
  activeId,
  onOpenFile,
  label,
}: FileTreeProps) {
  const nodes = useMemo(() => {
    const map = new Map<string, Node>([
      [rootId, { name: rootName, kind: "folder", children: [] }],
    ])
    for (const entry of entries) {
      map.set(entry.id, { name: entry.name, kind: entry.kind, children: [] })
    }
    for (const entry of entries)
      map.get(entry.parentId)?.children.push(entry.id)
    return map
  }, [rootId, rootName, entries])

  const tree = useTree<Node>({
    rootItemId: rootId,
    indent: INDENT,
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => item.getItemData().kind === "folder",
    onPrimaryAction: (item) => {
      if (item.getItemData().kind === "file") onOpenFile(item.getId())
    },
    dataLoader: {
      getItem: (id) =>
        nodes.get(id) ?? { name: id, kind: "file", children: [] },
      getChildren: (id) => nodes.get(id)?.children ?? [],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
  })

  useEffect(() => {
    tree.rebuildTree()
  }, [tree, nodes])

  return (
    <Tree indent={INDENT} tree={tree} aria-label={label}>
      {tree.getItems().map((item) => {
        const data = item.getItemData()
        const active = item.getId() === activeId
        const Icon =
          data.kind === "file"
            ? FileTextIcon
            : item.isExpanded()
              ? FolderOpenIcon
              : FolderIcon
        return (
          <TreeItem key={item.getId()} item={item}>
            <TreeItemLabel
              aria-current={active ? "page" : undefined}
              className={
                active ? "bg-accent text-accent-foreground" : undefined
              }
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{item.getItemName()}</span>
              </span>
            </TreeItemLabel>
          </TreeItem>
        )
      })}
    </Tree>
  )
}
