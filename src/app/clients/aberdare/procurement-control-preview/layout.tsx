import { notFoundOnDemo } from '@/lib/demo/demoRouteGuards'

export default function AberdareClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Client-branded workspace: never present on the public demo. Guarding the
  // layout covers this route and everything nested under it.
  notFoundOnDemo()

  return children
}
