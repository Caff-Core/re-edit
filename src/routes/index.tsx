import { createFileRoute } from "@tanstack/react-router"

import { MarkdownDocument } from "@/features/markdown"

export const Route = createFileRoute("/")({
  staticData: { title: "Workspace" },
  component: Workspace,
})

/** Scratch buffer until file management (003) opens real documents. */
function Workspace() {
  return <MarkdownDocument name="Untitled" initialValue="" />
}
