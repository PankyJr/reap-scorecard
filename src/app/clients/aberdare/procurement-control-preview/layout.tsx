import { notFoundOnDemo } from '@/lib/demo/demoRouteGuards'
import { AppShell } from '@/components/layout/AppShell'

export default function AberdareClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Client-branded workspace: never present on the public demo. Guarding the
  // layout covers this route and everything nested under it.
  notFoundOnDemo()

  // Inside the same app shell (sidebar plus panel) as the rest of the app.
  return <AppShell>{children}</AppShell>
}
