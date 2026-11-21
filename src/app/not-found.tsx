import { Link } from "@tanstack/react-router"
import { CompassIcon } from "lucide-react"

import { appMessages } from "@/app/messages"
import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useMessages } from "@/lib/i18n"

export function NotFound() {
  const t = useMessages(appMessages)
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CompassIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{t.pageNotFound}</EmptyTitle>
        <EmptyDescription>{t.pageNotFoundHelp}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/" className={buttonVariants()}>
          {t.backToWorkspace}
        </Link>
      </EmptyContent>
    </Empty>
  )
}
