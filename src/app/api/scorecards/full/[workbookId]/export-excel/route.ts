import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  buildFullScorecardExportWorkbook,
  collectReferencedMetricKeys,
  type EngineResultForExport,
  type MetricRowForExport,
  type ValidationIssueForExport,
} from '@/lib/scorecard/full/export-workbook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeFilenamePart(name: string): string {
  const s = name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return s || 'company'
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ workbookId?: string }> },
) {
  const { workbookId } = await context.params

  if (!workbookId) {
    return new Response('Missing workbook id', { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: workbook } = await supabase
    .from('scorecard_workbooks')
    .select('id, company_id, filename, status, engine_version')
    .eq('id', workbookId)
    .single()

  if (!workbook) {
    return new Response('Workbook not found', { status: 404 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', workbook.company_id)
    .single()

  if (!company || company.owner_id !== user.id) {
    return new Response('Forbidden', { status: 403 })
  }

  const { data: latestRun } = await supabase
    .from('scorecard_engine_runs')
    .select('id')
    .eq('workbook_id', workbook.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestRun) {
    return new Response('No engine run for this workbook', { status: 404 })
  }

  const { data: latestResult } = await supabase
    .from('scorecard_engine_results')
    .select('result_json')
    .eq('engine_run_id', latestRun.id)
    .maybeSingle()

  const resultJson = (latestResult?.result_json ?? null) as EngineResultForExport | null
  if (!resultJson) {
    return new Response('No engine result to export', { status: 404 })
  }

  const { data: validationIssues } = await supabase
    .from('scorecard_validation_issues')
    .select('severity, message, sheet_name, cell_ref, issue_type, metadata')
    .eq('workbook_id', workbook.id)
    .order('created_at', { ascending: false })

  const metricKeys = collectReferencedMetricKeys(resultJson)

  let sourceMetrics: MetricRowForExport[] = []
  if (metricKeys.length > 0) {
    const { data: rows, error } = await supabase
      .from('scorecard_metric_values')
      .select(
        'pillar, metric_key, label, value_type, numeric_value, text_value, boolean_value, unit, source_sheet, source_cell, source_range, validation_state, validation_message',
      )
      .eq('workbook_id', workbook.id)
      .in('metric_key', metricKeys)

    if (error) {
      console.error('[export-excel] metric load failed', error)
      return new Response('Failed to load source metrics', { status: 500 })
    }
    sourceMetrics = (rows ?? []) as MetricRowForExport[]
  }

  const generatedAt = new Date()
  const generatedDisplay = generatedAt.toLocaleString()
  const datePart = generatedAt.toISOString().slice(0, 10)

  const buffer = buildFullScorecardExportWorkbook({
    companyName: company.name,
    workbookFilename: workbook.filename,
    workbookStatus: workbook.status,
    generatedAtDisplay: generatedDisplay,
    result: resultJson,
    validationIssues: (validationIssues ?? []) as ValidationIssueForExport[],
    sourceMetrics,
  })

  const filename = `full-scorecard-${safeFilenamePart(company.name)}-${datePart}.xlsx`

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
