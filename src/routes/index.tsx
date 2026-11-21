import { Link, createFileRoute } from "@tanstack/react-router"
import { FileTextIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export const Route = createFileRoute("/")({
  staticData: { title: "Workspace" },
  component: Workspace,
})

function Workspace() {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileTextIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No document open</EmptyTitle>
        <EmptyDescription>
          The editor and file actions arrive with the next foundation tasks. Set
          up your theme in the meantime.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/settings" className={buttonVariants()}>
          Open settings
        </Link>
      </EmptyContent>
    </Empty>
  )
}
