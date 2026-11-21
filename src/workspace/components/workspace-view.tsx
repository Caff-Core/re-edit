import { FilePlusIcon, FileTextIcon, SaveIcon } from "lucide-react"
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
  DropdownMenuItem,
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

import { useWorkspace } from "../workspace-provider"

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

/**
 * Open documents as tabs. Every editor stays mounted while its tab is open, so
 * switching tabs keeps each document's own state and undo history.
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

  const { save } = workspace
  useEffect(() => {
    if (hidden || !activeId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void save(activeId)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [hidden, activeId, save])

  if (documents.length === 0) {
    const [primary, ...others] = types
    return (
      <Empty hidden={hidden} className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileTextIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No document open</EmptyTitle>
          <EmptyDescription>
            Start a new document to begin writing.
          </EmptyDescription>
        </EmptyHeader>
        {primary ? (
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              type="button"
              onClick={() => workspace.newDocument(primary.id)}
            >
              New {primary.label}
            </Button>
            {others.map((type) => (
              <Button
                key={type.id}
                type="button"
                variant="outline"
                onClick={() => workspace.newDocument(type.id)}
              >
                New {type.label}
              </Button>
            ))}
          </EmptyContent>
        ) : null}
      </Empty>
    )
  }

  const newMenu = (
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
                  aria-label="New document"
                />
              }
            />
          }
        >
          <FilePlusIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>New document</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        {types.map((type) => (
          <DropdownMenuItem
            key={type.id}
            onClick={() => workspace.newDocument(type.id)}
          >
            New {type.label}
          </DropdownMenuItem>
        ))}
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
      <TooltipContent>Save (Ctrl+S)</TooltipContent>
    </Tooltip>
  )

  return (
    <div hidden={hidden} className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Tabs
        value={activeId}
        onValueChange={(value) => workspace.activate(String(value))}
        className="min-h-0 flex-1 gap-0"
      >
        <DocumentTabs
          tabs={documents.map(({ id, title, dirty }) => ({ id, title, dirty }))}
          onClose={requestClose}
          actions={
            <>
              {newMenu}
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
                  onDirtyChange={(dirty) =>
                    workspace.setDirty(document.id, dirty)
                  }
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
