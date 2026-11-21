import {
  Outlet,
  createRootRoute,
  rootRouteId,
  useMatches,
  useRouterState,
} from "@tanstack/react-router"
import { FilePenLineIcon, PenLineIcon, SettingsIcon } from "lucide-react"

import { AppStatus } from "@/app/app-status"
import { NotFound } from "@/app/not-found"
import type { AppSidebarItem } from "@/components/organisms/app-sidebar"
import { AppShell } from "@/components/templates/app-shell"

const BRAND = {
  name: "re-edit",
  description: "Markdown editor",
  icon: <PenLineIcon />,
}

const NAV: AppSidebarItem[] = [
  { to: "/", label: "Workspace", icon: <FilePenLineIcon aria-hidden="true" /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon aria-hidden="true" /> },
]

function RootLayout() {
  const matches = useMatches()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // Every real page is a child route, so a root-only match means nothing matched.
  const leaf = matches[matches.length - 1]
  const title =
    leaf === undefined || leaf.routeId === rootRouteId
      ? "Not found"
      : (leaf.staticData.title ?? BRAND.name)

  return (
    <AppShell
      brand={BRAND}
      nav={NAV}
      activePath={pathname}
      title={title}
      status={<AppStatus />}
    >
      <Outlet />
    </AppShell>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})
