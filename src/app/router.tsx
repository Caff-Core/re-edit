import {
  createHashHistory,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router"

import { routeTree } from "@/routeTree.gen"

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
  interface StaticDataRouteOption {
    /** Page title shown in the shell header. */
    title?: string
  }
}

/**
 * Hash history keeps every route inside the single index.html that Tauri
 * serves, so a reload never asks the host for a path it does not have.
 */
export function createAppRouter(history: RouterHistory = createHashHistory()) {
  return createRouter({ routeTree, history })
}
