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

import { useLocale, useMessages } from "@/lib/i18n"
import { useDescribeError } from "@/services/native"

import { workspaceMessages } from "../messages"
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
  const t = useMessages(workspaceMessages)
  return (
    <div
      role="status"
      aria-label={t.loadingEditor}
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
  const t = useMessages(workspaceMessages)
  const { locale } = useLocale()
  const describe = useDescribeError()
  const { documents, activeId } = workspace.state
  /** Types that can start a new, empty document (PDF cannot). */
  const types = workspace.registry.list().filter((type) => type.createEmpty)
  /** Tabs waiting on the discard prompt, in tab order. */
  const [closing, setClosing] = useState<string[] | null>(null)
  const unsavedClosing = documents.filter(
    (d) => d.dirty && closing?.includes(d.id)
  )
  const active = documents.find((d) => d.id === activeId)
  const activeType = active && workspace.registry.get(active.typeId)
  const canExport = activeType?.exporter !== undefined
  /** "Save", or the type's own label such as "Save Edited Copy". */
  const saveLabel = activeType?.saveLabel?.[locale] ?? t.save
  const activeCommands = (active && workspace.commands[active.id]) ?? {}
  const routed = (
    [
      ["undo", t.undo],
      ["redo", t.redo],
      ["find", t.find],
      ["format", t.formatDocument],
    ] as const
  ).filter(([command]) => command in activeCommands)
  /** The document whose conflict waits for the Reload confirmation. */
  const [reloading, setReloading] = useState<string | null>(null)
  const reloadingDocument = documents.find((d) => d.id === reloading)

  /** Closes the tabs, asking once first when any of them is unsaved. */
  const requestClose = (ids: string[]) => {
    if (documents.some((d) => d.dirty && ids.includes(d.id))) setClosing(ids)
    else workspace.closeMany(ids)
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
                  aria-label={t.file}
                />
              }
            />
          }
        >
          <MenuIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t.file}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          {types.map((type, index) => (
            <DropdownMenuItem
              key={type.id}
              onClick={() => workspace.newDocument(type.id)}
            >
              {t.newDocument(type.label[locale])}
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
            {t.openFileMenu}
            <DropdownMenuShortcut>
              {FILE_SHORTCUTS.openFile}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void workspace.openFolderDialog()}>
            {t.openFolderMenu}
            <DropdownMenuShortcut>
              {FILE_SHORTCUTS.openFolder}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={recents.length === 0}>
              {t.openRecent}
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
            {saveLabel}
            <DropdownMenuShortcut>{FILE_SHORTCUTS.save}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!active}
            onClick={() => active && void workspace.saveAs(active.id)}
          >
            {t.saveAsMenu}
            <DropdownMenuShortcut>{FILE_SHORTCUTS.saveAs}</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {active && routed.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {/* Only the commands the active document supports. */}
            <DropdownMenuGroup>
              {routed.map(([command, label]) => (
                <DropdownMenuItem
                  key={command}
                  disabled={!activeCommands[command]}
                  onClick={() => workspace.runCommand(active.id, command)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!canExport}
            onClick={() =>
              active && void workspace.exportDocument(active.id, "html")
            }
          >
            {t.exportHtml}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canExport}
            onClick={() =>
              active && void workspace.exportDocument(active.id, "pdf")
            }
          >
            {t.exportPdf}
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
            aria-label={saveLabel}
            aria-keyshortcuts="Control+S"
            disabled={!active}
            onClick={() => active && void workspace.save(active.id)}
          />
        }
      >
        <SaveIcon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>
        {t.saveWithShortcut(saveLabel, FILE_SHORTCUTS.save)}
      </TooltipContent>
    </Tooltip>
  )

  const notice = workspace.notice ? (
    <Alert
      variant={workspace.notice.tone === "error" ? "destructive" : "default"}
      className="m-2 w-auto"
      role={workspace.notice.tone === "error" ? "alert" : "status"}
    >
      {workspace.notice.tone === "error" ? (
        <AlertTitle>{t.somethingWentWrong}</AlertTitle>
      ) : null}
      <AlertDescription>
        {workspace.notice.message(t, describe)}
      </AlertDescription>
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
            {t.retry}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={workspace.dismissNotice}
        >
          {t.dismiss}
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
        <EmptyTitle>{t.noDocumentTitle}</EmptyTitle>
        <EmptyDescription>{t.noDocumentDescription}</EmptyDescription>
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
              {t.newDocument(type.label[locale])}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => void workspace.openFileDialog()}
          >
            <FileTextIcon aria-hidden="true" data-icon="inline-start" />
            {t.openFile}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void workspace.openFolderDialog()}
          >
            <FolderOpenIcon aria-hidden="true" data-icon="inline-start" />
            {t.openFolder}
          </Button>
        </div>
        {recents.length > 0 ? (
          <nav
            aria-label={t.recent}
            className="flex w-full max-w-sm flex-col gap-1"
          >
            <h2 className="text-xs font-medium text-muted-foreground">
              {t.recent}
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
              onClose={(id) => requestClose([id])}
              onCloseMany={requestClose}
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
              const conflict = workspace.conflicts[document.id]
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
                      <AlertTitle>{t.notSaved(document.title)}</AlertTitle>
                      <AlertDescription>{describe(error)}</AlertDescription>
                      <AlertAction>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void workspace.save(document.id)}
                        >
                          {t.retry}
                        </Button>
                      </AlertAction>
                    </Alert>
                  ) : null}
                  {conflict ? (
                    <Alert className="m-2 w-auto">
                      <AlertTitle>
                        {conflict.disk === null
                          ? t.deletedOnDisk(document.title)
                          : t.changedOnDisk(document.title)}
                      </AlertTitle>
                      <AlertDescription className="flex flex-col gap-2">
                        <span>
                          {conflict.disk === null
                            ? t.deletedHelp
                            : t.changedHelp}
                        </span>
                        <span className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void workspace.saveCopy(document.id)}
                          >
                            {t.saveCopy}
                          </Button>
                          {conflict.disk === null ? null : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReloading(document.id)}
                            >
                              {t.reload}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => workspace.keepEditing(document.id)}
                          >
                            {t.keepEditing}
                          </Button>
                        </span>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <Suspense fallback={<EditorSkeleton />}>
                    <Editor
                      documentId={document.id}
                      title={document.title}
                      initial={document.initial}
                      saved={document.saved}
                      onCommandsChange={(commands) =>
                        workspace.setCommands(document.id, commands)
                      }
                      onDirtyChange={(dirty) =>
                        workspace.setDirty(document.id, dirty)
                      }
                      onEdit={() => workspace.noteEdit(document.id)}
                      path={document.path}
                      resolveAsset={workspace.assetResolver(document.id)}
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
        open={unsavedClosing.length > 0}
        onOpenChange={(open) => {
          if (!open) setClosing(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {unsavedClosing.length > 1
                ? t.discardManyTitle(unsavedClosing.length)
                : t.discardTitle(unsavedClosing[0]?.title ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unsavedClosing.length > 1
                ? t.discardManyDescription
                : t.discardDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.keepEditing}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (closing) workspace.closeMany(closing)
                setClosing(null)
              }}
            >
              {t.discardAndClose}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={reloadingDocument !== undefined}
        onOpenChange={(open) => {
          if (!open) setReloading(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.reloadTitle(reloadingDocument?.title ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.reloadDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.keepEditing}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (reloading) void workspace.reloadFromDisk(reloading)
                setReloading(null)
              }}
            >
              {t.reloadConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
