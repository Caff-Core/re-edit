import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { defineMessages, useMessages } from "@/lib/i18n"

const messages = defineMessages({
  en: { primary: "Primary" },
  "zh-CN": { primary: "主导航" },
})

export interface AppSidebarItem {
  to: LinkProps["to"]
  label: string
  icon: ReactNode
}

export interface AppSidebarBrand {
  name: string
  description: string
  icon: ReactNode
}

export interface AppSidebarProps {
  brand: AppSidebarBrand
  items: AppSidebarItem[]
  /** Pathname of the current route, used to mark the active item. */
  activePath: string
}

function isActive(itemPath: string, activePath: string) {
  return itemPath === "/" ? activePath === "/" : activePath.startsWith(itemPath)
}

/**
 * Primary navigation as an icon rail. Each row carries a `tooltip`, which is
 * the only visible name once the rail collapses to 3rem; the label stays in
 * the button for assistive technology.
 */
export function AppSidebar({ brand, items, activePath }: AppSidebarProps) {
  const t = useMessages(messages)
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={brand.name}
              render={<Link to="/" />}
            >
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground [&>svg]:size-4"
              >
                {brand.icon}
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:sr-only">
                <span className="truncate text-sm font-medium">
                  {brand.name}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {brand.description}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent role="navigation" aria-label={t.primary}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={String(item.to)}>
                  <SidebarMenuButton
                    render={<Link to={item.to} />}
                    isActive={isActive(String(item.to), activePath)}
                    tooltip={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* SidebarRail is a mouse affordance with tabIndex -1; SidebarTrigger in the header is the keyboard path. */}
      <SidebarRail />
    </Sidebar>
  )
}
