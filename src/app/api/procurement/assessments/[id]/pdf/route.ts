import { NextResponse } from 'next/server'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import { resolveTenantReadContext } from '@/lib/admin/tenant-read-context'
import { buildProcurementResultFromRows } from '@/lib/procurement/assessment'
import type { ProcurementCategoryKey } from '@/lib/procurement/config'
import {
  TMPS_EXCLUSIONS,
  TMPS_INCLUSIONS,
  calculateProcurementTmpsTotals,
  coerceProcurementTmpsInputsFromRecord,
} from '@/lib/procurement/tmps'
import { parseTmpsCustomLinesFromUnknown } from '@/lib/procurement/tmpsCustom'
import { parseTmpsDenominatorSource, tmpsDenominatorSourceTitle } from '@/lib/procurement/tmpsDenominator'
import { buildProcurementPdf } from '@/lib/reports/pdf/procurement'
import { procurementPdfInput } from '@/lib/reports/pdf/from-app'
import { safePdfFilename } from '@/lib/reports/pdf/format'

/**
 * The procurement scorecard as a PDF, drawn on the server with pdf-lib: no
 * browser, no files read at run time, so it works on Netlify's functions
 * (the Chromium route it replaces failed there from July). The owner, or a
 * REAP administrator, may download it; anyone else gets 404.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = Record<string, number | string | null | undefined>

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, db, isReapInternalAdmin } = await resolveTenantReadContext()

  const { data: assessment } = await db
    .from('procurement_assessments')
    .select('*, company:companies(*)')
    .eq('id', id)
    .maybeSingle()
  type CompanyRow = { id: string; name: string; owner_id: string | null }
  const company = firstEmbeddedRow(assessment?.company as CompanyRow | CompanyRow[] | null | undefined)
  const isOwner = Boolean(user && company?.owner_id && company.owner_id === user.id)
  if (!assessment || !company || (!isReapInternalAdmin && !isOwner)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [{ data: suppliers }, { data: resultRows }] = await Promise.all([
    db.from('procurement_suppliers').select('*').eq('assessment_id', assessment.id),
    db.from('procurement_results').select('*').eq('assessment_id', assessment.id).order('category_name'),
  ])
  const result = resultRows?.length
    ? buildProcurementResultFromRows(
        resultRows as unknown as {
          category_key: ProcurementCategoryKey
          category_name: string
          target_percent: number
          available_points: number
          achieved_percent: number
          points_achieved: number
          numerator_value: number
          denominator_value: number
        }[],
      )
    : null

  const record = assessment as unknown as Row
  const customIn = parseTmpsCustomLinesFromUnknown(record.tmps_custom_inclusions)
  const customOut = parseTmpsCustomLinesFromUnknown(record.tmps_custom_exclusions)
  const hasLines =
    [...TMPS_INCLUSIONS, ...TMPS_EXCLUSIONS].some((l) => record[l.key] != null) || customIn.length > 0 || customOut.length > 0
  const inputs = hasLines ? coerceProcurementTmpsInputsFromRecord(record) : null
  const totals = inputs ? calculateProcurementTmpsTotals(inputs, { inclusions: customIn, exclusions: customOut }) : null
  const line = (label: string, amount: unknown) => ({ label, amount: amount == null ? null : Number(amount) })

  const pdf = await buildProcurementPdf(
    procurementPdfInput({
      companyName: company.name,
      assessmentName: (record.name as string | null) ?? `Procurement ${record.assessment_year ?? ''}`.trim(),
      assessmentYear: (record.assessment_year as number | null) ?? null,
      generatedAt: new Date(),
      result,
      suppliers: suppliers ?? [],
      totalMeasuredSpend: record.total_measured_procurement_spend == null ? null : Number(record.total_measured_procurement_spend),
      tmps: inputs
        ? {
            inclusions: [
              ...TMPS_INCLUSIONS.map((l) => line(l.label, inputs[l.key])),
              ...customIn.map((l) => line(l.label, l.amount)),
            ],
            exclusions: [
              ...TMPS_EXCLUSIONS.map((l) => line(l.label, inputs[l.key])),
              ...customOut.map((l) => line(l.label, l.amount)),
            ],
            inclusionsTotal: totals?.inclusionsTotal ?? null,
            exclusionsTotal: totals?.exclusionsTotal ?? null,
          }
        : null,
      tmpsBasis: tmpsDenominatorSourceTitle(parseTmpsDenominatorSource(record.tmps_denominator_source as string | null | undefined)),
    }),
  )

  const filename = safePdfFilename(['REAP procurement scorecard', company.name, record.assessment_year == null ? null : String(record.assessment_year)])
  return new NextResponse(Buffer.from(pdf.bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
