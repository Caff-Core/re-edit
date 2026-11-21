import { FolderOpenIcon, RefreshCwIcon, XIcon } from "lucide-react"
import type { ReactNode } from "react"

import { FileTree } from "@/components/organisms/file-tree"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { basename } from "../paths"
import { useWorkspace, type FolderState } from "../workspace-provider"

function PanelAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Side panel listing the open folder. */
export function FolderPanel({ folder }: { folder: FolderState }) {
  const workspace = useWorkspace()
  const name = basename(folder.path)
  const activePath =
    workspace.state.documents.find((d) => d.id === workspace.state.activeId)
      ?.path ?? null

  return (
    <aside
      aria-label={`Folder ${name}`}
      className="flex w-64 shrink-0 flex-col border-r"
    >
      <div className="flex h-10 shrink-0 items-center gap-1 border-b pr-1 pl-3">
        <FolderOpenIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium"
          title={folder.path}
        >
          {name}
        </span>
        <PanelAction
          label="Refresh folder"
          onClick={() => void workspace.openFolder(folder.path)}
        >
          <RefreshCwIcon aria-hidden="true" />
        </PanelAction>
        <PanelAction label="Close folder" onClick={workspace.closeFolder}>
          <XIcon aria-hidden="true" />
        </PanelAction>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {folder.status === "loading" ? (
          <div
            role="status"
            aria-label="Loading folder"
            className="flex flex-col gap-2 p-1"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : folder.status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Folder could not be read</AlertTitle>
            <AlertDescription>{folder.error}</AlertDescription>
            <AlertAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void workspace.openFolder(folder.path)}
              >
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : folder.listing.entries.every((e) => e.kind === "folder") ? (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyTitle>No documents here</EmptyTitle>
              <EmptyDescription>
                This folder has no files the editor can open.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void workspace.openFolderDialog()}
              >
                Open another folder
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            <FileTree
              label={`Files in ${name}`}
              rootId={folder.listing.root}
              rootName={name}
              entries={folder.listing.entries.map((e) => ({
                id: e.path,
                name: e.name,
                parentId: e.parent,
                kind: e.kind,
              }))}
              activeId={activePath}
              onOpenFile={(path) => void workspace.openPath(path)}
            />
            {folder.listing.truncated ? (
              <p className="px-2 text-xs text-muted-foreground">
                This folder is large; some files are not listed.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  )
}
