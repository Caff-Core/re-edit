import {
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  MenuIcon,
  SaveIcon,
} from "lucide-react"
import { Suspense, useEffect, useState } from "react"

import { DocumentTabs } from "@/components/organisms/document-tabs"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { basename } from "../paths"
import type { RecentEntry } from "../session"
import { useWorkspace } from "../workspace-provider"
import { FolderPanel } from "./folder-panel"

export const FILE_SHORTCUTS = {
  newDocument: "Ctrl+N",
  openFile: "Ctrl+O",
  openFolder: "Ctrl+Shift+O",
  save: "Ctrl+S",
  saveAs: "Ctrl+Shift+S",
} as const

function EditorSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading editor"
      className="flex flex-col gap-3 p-6"
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

function RecentIcon({ entry }: { entry: RecentEntry }) {
  const Icon = entry.kind === "folder" ? FolderIcon : FileTextIcon
  return <Icon aria-hidden="true" />
}

/**
 * Open documents as tabs, with the open folder beside them. Every editor
 * stays mounted while its tab is open, so switching tabs keeps each
 * document's own state and undo history.
 */
export function WorkspaceView({ hidden = false }: { hidden?: boolean }) {
  const workspace = useWorkspace()
  const { documents, activeId } = workspace.state
  const types = workspace.registry.list()
  const [closing, setClosing] = useState<string | null>(null)
  const closingDocument = documents.find((d) => d.id === closing)
  const active = documents.find((d) => d.id === activeId)

  const requestClose = (id: string) => {
    const document = documents.find((d) => d.id === id)
    if (document?.dirty) setClosing(id)
    else workspace.close(id)
  }

  const { save, saveAs, newDocument, openFileDialog, openFolderDialog } =
    workspace
  const firstType = types[0]?.id
  useEffect(() => {
    if (hidden) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      const run = (action: () => unknown) => {
        event.preventDefault()
        void action()
      }
      if (key === "s" && activeId) {
        run(() => (event.shiftKey ? saveAs(activeId) : save(activeId)))
      } else if (key === "o") {
        run(event.shiftKey ? openFolderDialog : openFileDialog)
      } else if (key === "n" && !event.shiftKey && firstType) {
        run(() => newDocument(firstType))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    hidden,
    activeId,
    firstType,
    save,
    saveAs,
    newDocument,
    openFileDialog,
    openFolderDialog,
  ])

  const recents = workspace.recents

  const fileMenu = (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="File"
                />
              }
            />
          }
        >
          <MenuIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>File</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          {types.map((type, index) => (
            <DropdownMenuItem
              key={type.id}
              onClick={() => workspace.newDocument(type.id)}
            >
              New {type.label}
              {index === 0 ? (
                <DropdownMenuShortcut>
                  {FILE_SHORTCUTS.newDocument}
                </DropdownMenuShortcut>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void workspace.openFileDialog()}>
            Open file…
            <DropdownMenuShortcut>
              {FILE_SHORTCUTS.openFile}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void workspace.openFolderDialog()}>
            Open folder…
            <DropdownMenuShortcut>
              {FILE_SHORTCUTS.openFolder}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={recents.length === 0}>
              Open recent
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-72">
              {recents.map((entry) => (
                <DropdownMenuItem
                  key={entry.path}
                  title={entry.path}
                  onClick={() => void workspace.openRecent(entry)}
                >
                  <RecentIcon entry={entry} />
                  <span className="truncate">{basename(entry.path)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!active}
            onClick={() => active && void workspace.save(active.id)}
          >
            Save
            <DropdownMenuShortcut>{FILE_SHORTCUTS.save}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!active}
            onClick={() => active && void workspace.saveAs(active.id)}
          >
            Save as…
            <DropdownMenuShortcut>{FILE_SHORTCUTS.saveAs}</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const saveButton = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Save"
            aria-keyshortcuts="Control+S"
            disabled={!active}
            onClick={() => active && void workspace.save(active.id)}
          />
        }
      >
        <SaveIcon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>Save ({FILE_SHORTCUTS.save})</TooltipContent>
    </Tooltip>
  )

  const notice = workspace.notice ? (
    <Alert variant="destructive" className="m-2 w-auto">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{workspace.notice.message}</AlertDescription>
      <AlertAction className="flex gap-2">
        {workspace.notice.retry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const retry = workspace.notice?.retry
              workspace.dismissNotice()
              retry?.()
            }}
          >
            Retry
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={workspace.dismissNotice}
        >
          Dismiss
        </Button>
      </AlertAction>
    </Alert>
  ) : null

  const empty = (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileTextIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No document open</EmptyTitle>
        <EmptyDescription>
          Start a new document, or open a file or folder from disk.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-2">
          {types.map((type, index) => (
            <Button
              key={type.id}
              type="button"
              variant={index === 0 ? "default" : "outline"}
              onClick={() => workspace.newDocument(type.id)}
            >
              New {type.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => void workspace.openFileDialog()}
          >
            <FileTextIcon aria-hidden="true" data-icon="inline-start" />
            Open file
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void workspace.openFolderDialog()}
          >
            <FolderOpenIcon aria-hidden="true" data-icon="inline-start" />
            Open folder
          </Button>
        </div>
        {recents.length > 0 ? (
          <nav
            aria-label="Recent"
            className="flex w-full max-w-sm flex-col gap-1"
          >
            <h2 className="text-xs font-medium text-muted-foreground">
              Recent
            </h2>
            <ul className="flex flex-col">
              {recents.map((entry) => (
                <li key={entry.path}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    title={entry.path}
                    onClick={() => void workspace.openRecent(entry)}
                  >
                    <RecentIcon entry={entry} />
                    <span className="truncate">{basename(entry.path)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </EmptyContent>
    </Empty>
  )

  return (
    <div hidden={hidden} className="flex min-h-0 min-w-0 flex-1">
      {workspace.folder ? <FolderPanel folder={workspace.folder} /> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {notice}
        {documents.length === 0 ? (
          empty
        ) : (
          <Tabs
            value={activeId}
            onValueChange={(value) => workspace.activate(String(value))}
            className="min-h-0 flex-1 gap-0"
          >
            <DocumentTabs
              tabs={documents.map(({ id, title, dirty }) => ({
                id,
                title,
                dirty,
              }))}
              onClose={requestClose}
              actions={
                <>
                  {fileMenu}
                  {saveButton}
                </>
              }
            />
            {documents.map((document) => {
              const type = workspace.registry.get(document.typeId)
              const error = workspace.saveErrors[document.id]
              if (!type) return null
              const Editor = type.Editor
              return (
                <TabsContent
                  key={document.id}
                  value={document.id}
                  keepMounted
                  className="flex min-h-0 min-w-0 flex-col data-hidden:hidden"
                >
                  {error ? (
                    <Alert variant="destructive" className="m-2 w-auto">
                      <AlertTitle>{document.title} was not saved</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                      <AlertAction>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void workspace.save(document.id)}
                        >
                          Retry
                        </Button>
                      </AlertAction>
                    </Alert>
                  ) : null}
                  <Suspense fallback={<EditorSkeleton />}>
                    <Editor
                      documentId={document.id}
                      title={document.title}
                      initialContent={document.initialContent}
                      savedContent={document.savedContent}
                      onDirtyChange={(dirty) =>
                        workspace.setDirty(document.id, dirty)
                      }
                      onEdit={() => workspace.noteEdit(document.id)}
                      ref={(handle) => {
                        workspace.registerEditor(document.id, handle)
                        return () => workspace.registerEditor(document.id, null)
                      }}
                    />
                  </Suspense>
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </div>

      <AlertDialog
        open={closingDocument !== undefined}
        onOpenChange={(open) => {
          if (!open) setClosing(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Discard changes to {closingDocument?.title}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Closing this document loses the changes made since it was last
              saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (closing) workspace.close(closing)
                setClosing(null)
              }}
            >
              Discard and close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
