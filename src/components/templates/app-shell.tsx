import type { ReactNode } from "react"

import {
  AppSidebar,
  type AppSidebarBrand,
  type AppSidebarItem,
} from "@/components/organisms/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export interface AppShellProps {
  brand: AppSidebarBrand
  nav: AppSidebarItem[]
  activePath: string
  /** Title of the current page, shown in the header. */
  title: string
  /** Content of the status bar along the bottom edge. */
  status: ReactNode
  children: ReactNode
}

/**
 * Desktop layout: a collapsible icon rail, a header with the page title, the
 * routed content, and a status bar.
 *
 * `h-svh min-h-0` keeps the shell exactly window tall so only the content
 * region scrolls; SidebarProvider ships `min-h-svh`, and the `min-h-0` pair is
 * what lets tailwind-merge drop it.
 */
export function AppShell({
  brand,
  nav,
  activePath,
  title,
  status,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider className="h-svh min-h-0 w-full overflow-hidden">
      <AppSidebar brand={brand} items={nav} activePath={activePath} />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          <h1 className="truncate text-sm font-medium">{title}</h1>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
        <footer
          aria-label="Status"
          className="flex h-8 shrink-0 items-center gap-2 border-t px-3 text-xs text-muted-foreground"
        >
          {status}
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
