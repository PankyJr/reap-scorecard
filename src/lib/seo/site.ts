/** Canonical public marketing origin — set NEXT_PUBLIC_SITE_URL in production. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reap-solutions.co.za').replace(/\/$/, '')
}

export const SITE_NAME = 'REAP Solutions'

export const DEFAULT_SITE_DESCRIPTION =
  'Specialist B-BBEE transformation advisory, training, and REAP Scorecard procurement assessments for South African businesses.'
