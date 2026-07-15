import { redirect } from 'next/navigation'

/**
 * Legacy manual scorecard entry — redirects to the procurement-first client flow.
 * Internal access: append ?legacy=1 to load the legacy form (compatibility only).
 */
export default async function LegacyScorecardNewRedirect({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; error?: string; legacy?: string }>
}) {
  const params = await searchParams

  if (params.legacy === '1') {
    const { default: LegacyPage } = await import('./LegacyScorecardNewPage')
    return <LegacyPage searchParams={Promise.resolve(params)} />
  }

  const qs = new URLSearchParams()
  if (params.companyId) qs.set('companyId', params.companyId)
  if (params.error) qs.set('error', params.error)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  redirect(`/procurement/assessments/new${suffix}`)
}
