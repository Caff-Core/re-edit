import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"

import "./index.css"
import { suppressNativeContextMenu } from "@/app/native-context-menu"
import { ThemeProvider } from "@/app/providers/theme-provider"
import { createAppRouter } from "@/app/router"
import { TooltipProvider } from "@/components/ui/tooltip"

const router = createAppRouter()
suppressNativeContextMenu()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
