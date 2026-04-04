/**
 * Auth bypass (middleware skip) is only honored in local development.
 * Production and preview deployments ignore NEXT_PUBLIC_DEV_BYPASS_AUTH even if it is set by mistake.
 */
export function isAuthDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'
  )
}
