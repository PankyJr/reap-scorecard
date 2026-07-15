import { redirect } from 'next/navigation'

/**
 * Preview-only workbook upload — redirects to procurement assessment (primary demo path).
 * Internal preview: append ?legacy=1 to load the read-only preview page.
 */
export default async function ScorecardUploadRedirect({
  searchParams,
}: {
  searchParams: Promise<{ legacy?: string }>
}) {
  const params = await searchParams

  if (params.legacy === '1') {
    const { default: LegacyUploadPage } = await import('./LegacyUploadPage')
    return <LegacyUploadPage />
  }

  redirect('/procurement/assessments/new')
}
