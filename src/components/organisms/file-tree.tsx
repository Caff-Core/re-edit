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
  /** Draws a guide line for each nesting level. */
  showLines?: boolean
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
  showLines = false,
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

  // ReUI's Tree calls getContainerProps() without a label and spreads it
  // over our props, which would leave the tree with an empty accessible
  // name. Hand it a view of the tree that supplies the label.
  const labelledTree = useMemo(
    () =>
      new Proxy(tree, {
        get: (target, key, receiver) =>
          key === "getContainerProps"
            ? () => target.getContainerProps(label)
            : Reflect.get(target, key, receiver),
      }),
    [tree, label]
  )

  return (
    <Tree
      indent={INDENT}
      tree={labelledTree}
      data-lines={showLines || undefined}
      // ReUI's indent-lines pattern (c-tree-2): one border-colored line per
      // indent step, drawn behind the items, so it follows the theme.
      className={
        showLines
          ? "relative before:absolute before:inset-0 before:-ms-1 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]"
          : undefined
      }
    >
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
