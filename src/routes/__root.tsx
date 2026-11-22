import {
  Outlet,
  createRootRoute,
  rootRouteId,
  useMatches,
  useRouterState,
} from "@tanstack/react-router"
import { FilePenLineIcon, PenLineIcon, SettingsIcon } from "lucide-react"

import { AppStatus } from "@/app/app-status"
import { appMessages } from "@/app/messages"
import { InterfaceSizeProvider } from "@/app/providers/interface-size-provider"
import { MotionProvider } from "@/app/providers/motion-provider"
import { AppWindowControls } from "@/app/app-window-controls"
import {
  documentRegistry,
  fileService,
  sessionStore,
} from "@/app/document-types"
import { NotFound } from "@/app/not-found"
import type { AppSidebarItem } from "@/components/organisms/app-sidebar"
import { AppShell } from "@/components/templates/app-shell"
import { LocaleProvider, useLocale, useMessages } from "@/lib/i18n"
import { nativeService } from "@/services/native"
import { WorkspaceProvider, WorkspaceView } from "@/workspace"

const APP_NAME = "re-edit"

function RootLayout() {
  return (
    <LocaleProvider>
      <MotionProvider>
        <InterfaceSizeProvider>
          <RootContent />
        </InterfaceSizeProvider>
      </MotionProvider>
    </LocaleProvider>
  )
}

function RootContent() {
  const t = useMessages(appMessages)
  const { locale } = useLocale()
  const brand = {
    name: APP_NAME,
    description: t.brandDescription,
    icon: <PenLineIcon />,
  }
  const nav: AppSidebarItem[] = [
    {
      to: "/",
      label: t.workspace,
      icon: <FilePenLineIcon aria-hidden="true" />,
    },
    {
      to: "/settings",
      label: t.settings,
      icon: <SettingsIcon aria-hidden="true" />,
    },
  ]
  const matches = useMatches()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  // Every real page is a child route, so a root-only match means nothing matched.
  const leaf = matches[matches.length - 1]
  const notFound = leaf === undefined || leaf.routeId === rootRouteId
  const title = notFound
    ? t.notFoundTitle
    : (leaf.staticData.title?.[locale] ?? APP_NAME)
  const showWorkspace = !notFound && leaf.routeId === "/"

  return (
    <WorkspaceProvider
      registry={documentRegistry}
      files={fileService}
      session={sessionStore}
    >
      <AppShell
        brand={brand}
        nav={nav}
        activePath={pathname}
        title={title}
        status={<AppStatus />}
        titleBarEnd={<AppWindowControls appWindow={nativeService.window} />}
      >
        <WorkspaceView hidden={!showWorkspace} />
        <Outlet />
      </AppShell>
    </WorkspaceProvider>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})
