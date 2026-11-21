import { createFileRoute } from "@tanstack/react-router"

/**
 * The workspace itself is rendered by the root layout so open documents and
 * their editors survive navigation; this route only marks it as visible.
 */
export const Route = createFileRoute("/")({
  staticData: { title: "Workspace" },
  component: () => null,
})
