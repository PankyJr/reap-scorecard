import { notFound, redirect } from 'next/navigation'

import { isDemoInstance } from './demoMode'

/**
 * Route guards for the public demonstration deployment.
 *
 * The demo build is the SYSTEM ONLY. It carries no marketing site, no client
 * workspaces and no prototypes — not hidden behind a flag, not unlinked but
 * still reachable: absent. A visitor who guesses a URL gets a 404, because the
 * page is not there to find.
 *
 * The reason is commercial, not technical. The marketing site names real
 * organisations REAP Solutions has worked with, and the client routes are
 * branded with a real client's name. None of that belongs on a public demo
 * whose own banner states it holds no client data.
 *
 * NEXT_PUBLIC_DEMO_MODE is inlined at build time, so on any other build
 * isDemoInstance() is a compile-time false and these are no-ops: the marketing
 * site and every route behave exactly as they always have.
 */

/** 404 on the demo build; do nothing anywhere else. */
export function notFoundOnDemo(): void {
  if (isDemoInstance()) notFound()
}

/**
 * Send the demo's root straight to the sign-in page.
 *
 * The demo has no home page to land on, and a visitor arriving at / wants the
 * system, not a 404.
 */
export function redirectRootToLoginOnDemo(): void {
  if (isDemoInstance()) redirect('/login')
}
