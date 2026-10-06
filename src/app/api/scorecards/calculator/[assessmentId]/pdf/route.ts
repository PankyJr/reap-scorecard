import { NextResponse } from 'next/server'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { loadGenericAssessment } from '@/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/load'
import { buildFullScorecardPdf } from '@/lib/reports/pdf/full-scorecard'
import { scorecardPdfInput } from '@/lib/reports/pdf/from-app'
import { safePdfFilename } from '@/lib/reports/pdf/format'

/**
 * The full B-BBEE scorecard as a PDF, drawn on the server with pdf-lib, so it
 * downloads on Netlify. Reads the saved calculation; a scorecard that has not
 * been calculated gives a short PDF that says so. Only the owner may download
 * it (the loader returns nothing for anyone else, which becomes 404).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { assessment, company } = loaded
  const pdf = await buildFullScorecardPdf(
    scorecardPdfInput({
      companyName: company.name,
      assessmentName: assessment.name,
      measurementYear: assessment.measurement_year ?? null,
      stored: (assessment.overall_result_snapshot as GenericScorecardCalculation | null) ?? null,
      needsRecalculation: Boolean(assessment.needs_recalculation),
      generatedAt: new Date(),
    }),
  )

  const filename = safePdfFilename(['REAP B-BBEE scorecard', company.name, assessment.measurement_year == null ? null : String(assessment.measurement_year)])
  return new NextResponse(Buffer.from(pdf.bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
