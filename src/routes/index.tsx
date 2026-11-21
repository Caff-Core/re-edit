import { createFileRoute } from "@tanstack/react-router"

import { appMessages } from "@/app/messages"

/**
 * The workspace itself is rendered by the root layout so open documents and
 * their editors survive navigation; this route only marks it as visible.
 */
export const Route = createFileRoute("/")({
  staticData: {
    title: {
      en: appMessages.en.workspace,
      "zh-CN": appMessages["zh-CN"].workspace,
    },
  },
  component: () => null,
})
