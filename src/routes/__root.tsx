import {
  Outlet,
  createRootRoute,
  rootRouteId,
  useMatches,
  useRouterState,
} from "@tanstack/react-router"
import { FilePenLineIcon, PenLineIcon, SettingsIcon } from "lucide-react"

import { AppStatus } from "@/app/app-status"
import { documentRegistry, documentStore } from "@/app/document-types"
import { NotFound } from "@/app/not-found"
import type { AppSidebarItem } from "@/components/organisms/app-sidebar"
import { AppShell } from "@/components/templates/app-shell"
import { WorkspaceProvider, WorkspaceView } from "@/workspace"

const BRAND = {
  name: "re-edit",
  description: "Markdown editor",
  icon: <PenLineIcon />,
}

const NAV: AppSidebarItem[] = [
  { to: "/", label: "Workspace", icon: <FilePenLineIcon aria-hidden="true" /> },
  {
    to: "/settings",
    label: "Settings",
    icon: <SettingsIcon aria-hidden="true" />,
  },
]

function RootLayout() {
  const matches = useMatches()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  // Every real page is a child route, so a root-only match means nothing matched.
  const leaf = matches[matches.length - 1]
  const notFound = leaf === undefined || leaf.routeId === rootRouteId
  const title = notFound ? "Not found" : (leaf.staticData.title ?? BRAND.name)
  const showWorkspace = !notFound && leaf.routeId === "/"

  return (
    <WorkspaceProvider registry={documentRegistry} store={documentStore}>
      <AppShell
        brand={BRAND}
        nav={NAV}
        activePath={pathname}
        title={title}
        status={<AppStatus />}
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
