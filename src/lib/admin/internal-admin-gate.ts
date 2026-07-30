/**
 * Pure access-control decision for REAP internal-admin surfaces (EAP targets, /admin).
 * Kept free of Next.js / Supabase imports so unit tests can cover every outcome.
 */
export type InternalAdminAccessDecision =
  | { outcome: 'login'; nextPath: string }
  | { outcome: 'forbidden' }
  | { outcome: 'allow' }

export function decideInternalAdminAccess(input: {
  authenticated: boolean
  isAdmin: boolean
  nextPath: string
}): InternalAdminAccessDecision {
  if (!input.authenticated) {
    return { outcome: 'login', nextPath: input.nextPath }
  }
  if (!input.isAdmin) {
    return { outcome: 'forbidden' }
  }
  return { outcome: 'allow' }
}
