/**
 * Demo-build replacement for src/components/dashboard/DashboardWorkspaceSelector.tsx.
 *
 * The real selector renders a client's logo and name. It is already switched
 * off on the demo by isClientWorkspaceEnabled(), but a component that never
 * renders still ships its markup — the logo path and the alt text included.
 *
 * The demo therefore compiles a selector that cannot render anything: the flag
 * is false, so the dashboard never reaches it.
 */
export function DashboardWorkspaceSelector() {
  return null
}
