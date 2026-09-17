import { createFileRoute } from '@tanstack/react-router'
import { servePage } from '@/lib/pages'

export const Route = createFileRoute('/$')({
  server: {
    handlers: {
      GET: async ({ request }) => servePage(new URL(request.url).pathname),
    },
  },
})
