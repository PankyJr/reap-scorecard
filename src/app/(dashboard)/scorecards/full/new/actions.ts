'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { parseWorkbookUpload } from '@/lib/scorecard/full/parser'
import {
  summarizeMetricValidation,
  validateParsedWorkbook,
} from '@/lib/scorecard/full/validators'
import { extractCanonicalMetrics } from '@/lib/scorecard/full/extractors'
import {
  FULL_SCORECARD_ENGINE_VERSION,
  runFullScorecardEngine,
} from '@/lib/scorecard/full/engine'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

/** Log + stringify PostgREST / Postgres errors from supabase-js insert/update/delete. */
function logSupabaseError(prefix: string, err: unknown) {
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as {
      message: string
      code?: string
      details?: string | null
      hint?: string | null
    }
    console.error(prefix, {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
    })
    return
  }
  console.error(prefix, err)
}

/**
 * PostgREST PGRST205 / "schema cache" when `scorecard_workbooks` (or related) tables
 * were never created on the linked project — migrations not applied.
 */
function fullScorecardSchemaNotAppliedHint(err: unknown): string | null {
  const raw = supabaseErrorSummary(err, 2000).toLowerCase()
  if (!raw) return null
  const missingWorkbook =
    raw.includes('pgrst205') ||
    (raw.includes('schema cache') && raw.includes('scorecard_workbook'))
  if (!missingWorkbook) return null
  return (
    'Supabase is missing full-scorecard tables for this app. Apply the repo migrations to your project ' +
    '(from the project root: `npx supabase link` then `npx supabase db push`, or run the SQL files under ' +
    '`supabase/migrations/` named `20260504183500_*`, `20260504191000_*`, `20260504195500_*`, and `20260505203000_*` in order in the SQL editor), then try again.'
  )
}

/** User-visible fragment (kept short for redirect URL). */
function supabaseErrorSummary(err: unknown, maxLen = 900): string {
  if (!err || typeof err !== 'object' || !('message' in err)) {
    return 'No Supabase error object was returned.'
  }
  const e = err as {
    message: string
    code?: string
    details?: string | null
    hint?: string | null
  }
  const parts = [
    e.message,
    e.code ? `code=${e.code}` : null,
    e.details ? `details=${e.details}` : null,
    e.hint ? `hint=${e.hint}` : null,
  ].filter(Boolean)
  const s = parts.join(' | ')
  return s.length <= maxLen ? s : `${s.slice(0, maxLen)}…`
}

function fail(companyId: string, message: string): never {
  redirect(
    `/scorecards/full/new?companyId=${encodeURIComponent(companyId)}&error=${encodeURIComponent(message)}`,
  )
}

export async function uploadFullScorecardWorkbook(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const companyId = String(formData.get('company_id') ?? '').trim()

  if (!companyId) {
    redirect('/companies')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, owner_id, name')
    .eq('id', companyId)
    .single()

  if (!company) {
    redirect('/companies')
  }

  if (!company.owner_id) {
    console.error('[FULL-SCORECARD] Company has null owner_id', { companyId: company.id, userId: user.id })
    fail(
      companyId,
      'This company has no owner_id in the database, so workbook uploads cannot pass access checks. In SQL (service role / dashboard): update public.companies set owner_id = \'<your-auth-user-uuid>\' where id = \'<company-id>\';',
    )
  }

  if (company.owner_id !== user.id) {
    redirect('/companies')
  }

  const fileField = formData.get('workbook')
  if (!(fileField instanceof File)) {
    fail(companyId, 'Please choose an .xlsx file to upload.')
  }

  if (!fileField.name.toLowerCase().endsWith('.xlsx')) {
    fail(companyId, 'Only .xlsx files are supported.')
  }

  if (fileField.size <= 0) {
    fail(companyId, 'Uploaded file is empty.')
  }

  if (fileField.size > MAX_UPLOAD_BYTES) {
    fail(companyId, 'File is too large. Maximum allowed size is 25MB.')
  }

  let parsedWorkbook
  try {
    parsedWorkbook = await parseWorkbookUpload(fileField)
  } catch (err) {
    console.error('[FULL-SCORECARD] Workbook parse failed', err)
    fail(companyId, 'Could not parse workbook. Please check the file and try again.')
  }

  const validation = validateParsedWorkbook(parsedWorkbook)

  const { data: insertedWorkbook, error: workbookError } = await supabase
    .from('scorecard_workbooks')
    .insert({
      company_id: company.id,
      uploaded_by: user.id,
      filename: parsedWorkbook.filename,
      file_size: parsedWorkbook.fileSize,
      status: validation.hasBlockingErrors ? 'validation_failed' : 'parsed',
      metadata: {
        required_sheets: validation.requiredSheets,
        supporting_sheets: validation.supportingSheets,
        detected_sheets: validation.detectedSheets,
        missing_required_sheets: validation.missingRequiredSheets,
      },
      processed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (workbookError || !insertedWorkbook) {
    logSupabaseError('[FULL-SCORECARD] Failed to insert workbook', workbookError)
    const hint = fullScorecardSchemaNotAppliedHint(workbookError)
    const detail = supabaseErrorSummary(workbookError)
    fail(companyId, hint ?? `Could not save workbook metadata. ${detail}`)
  }

  const sheetRows = parsedWorkbook.sheets.map((sheet) => ({
    workbook_id: insertedWorkbook.id,
    sheet_key: sheet.sheetKey,
    sheet_name: sheet.sheetName,
    row_count: sheet.rowCount,
    column_count: sheet.columnCount,
    raw_json: sheet.rows,
    parse_warnings: sheet.parseWarnings,
  }))

  if (sheetRows.length > 0) {
    const { error: sheetsError } = await supabase
      .from('scorecard_workbook_sheets')
      .insert(sheetRows)

    if (sheetsError) {
      logSupabaseError('[FULL-SCORECARD] Failed to insert workbook sheets', sheetsError)
      const hint = fullScorecardSchemaNotAppliedHint(sheetsError)
      fail(companyId, hint ?? 'Workbook parsed but sheet data could not be saved.')
    }
  }

  const extraction = extractCanonicalMetrics(parsedWorkbook)

  if (extraction.metrics.length > 0) {
    const metricRows = extraction.metrics.map((metric) => ({
      workbook_id: insertedWorkbook.id,
      metric_key: metric.metricKey,
      pillar: metric.pillar,
      section: metric.section ?? null,
      label: metric.label,
      value_type: metric.valueType,
      numeric_value: metric.numericValue,
      text_value: metric.textValue,
      boolean_value: metric.booleanValue,
      date_value: metric.dateValue,
      unit: metric.unit,
      source_sheet: metric.sourceSheet,
      source_cell: metric.sourceCell,
      source_range: metric.sourceRange,
      raw_value: metric.rawValue,
      validation_state: metric.validationState,
      validation_message: metric.validationMessage,
    }))

    const { error: metricInsertError } = await supabase
      .from('scorecard_metric_values')
      .insert(metricRows)

    if (metricInsertError) {
      logSupabaseError('[FULL-SCORECARD] Failed to insert canonical metrics', metricInsertError)
      const hint = fullScorecardSchemaNotAppliedHint(metricInsertError)
      fail(companyId, hint ?? 'Workbook parsed but extracted metrics could not be saved.')
    }
  }

  const allIssues = [...validation.issues, ...extraction.issues]
  const issueRows = allIssues.map((issue) => ({
    workbook_id: insertedWorkbook.id,
    issue_type: issue.issueType,
    severity: issue.severity,
    sheet_name: issue.sheetName ?? null,
    cell_ref: issue.cellRef ?? null,
    message: issue.message,
    metadata: {
      ...(issue.metadata ?? {}),
      metric_key: issue.metricKey ?? null,
    },
  }))

  if (issueRows.length > 0) {
    const { error: issuesError } = await supabase
      .from('scorecard_validation_issues')
      .insert(issueRows)

    if (issuesError) {
      console.error('[FULL-SCORECARD] Failed to insert validation issues', issuesError)
    }
  }

  const metricSummary = summarizeMetricValidation(extraction.metrics)
  const hasBlockingErrors =
    validation.hasBlockingErrors || metricSummary.errorCount > 0
  const finalStatus = hasBlockingErrors
    ? 'validation_failed'
    : metricSummary.warningCount > 0
      ? 'extracted_with_warnings'
      : 'extracted'

  const { error: updateWorkbookError } = await supabase
    .from('scorecard_workbooks')
    .update({
      status: finalStatus,
      metadata: {
        required_sheets: validation.requiredSheets,
        supporting_sheets: validation.supportingSheets,
        detected_sheets: validation.detectedSheets,
        missing_required_sheets: validation.missingRequiredSheets,
        extraction: metricSummary,
      },
      processed_at: new Date().toISOString(),
    })
    .eq('id', insertedWorkbook.id)

  if (updateWorkbookError) {
    console.error('[FULL-SCORECARD] Failed to update workbook status', updateWorkbookError)
  }

  redirect(
    `/scorecards/full/new?companyId=${encodeURIComponent(company.id)}&workbookId=${encodeURIComponent(insertedWorkbook.id)}`,
  )
}

export async function runScoringEngine(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const companyId = String(formData.get('company_id') ?? '').trim()
  const workbookId = String(formData.get('workbook_id') ?? '').trim()

  if (!companyId || !workbookId) {
    redirect('/companies')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workbook } = await supabase
    .from('scorecard_workbooks')
    .select('id, company_id')
    .eq('id', workbookId)
    .eq('company_id', companyId)
    .single()

  if (!workbook) {
    fail(companyId, 'Workbook not found for this company.')
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, owner_id')
    .eq('id', companyId)
    .single()

  if (!company || company.owner_id !== user.id) {
    redirect('/companies')
  }

  const { data: runRow, error: runError } = await supabase
    .from('scorecard_engine_runs')
    .insert({
      workbook_id: workbook.id,
      company_id: company.id,
      created_by: user.id,
      engine_version: FULL_SCORECARD_ENGINE_VERSION,
      status: 'running',
      metadata: {},
    })
    .select('id')
    .single()

  if (runError || !runRow) {
    console.error('[FULL-SCORECARD] Failed to create engine run', runError)
    fail(companyId, 'Could not start scoring engine.')
  }

  try {
    const { data: metricRows, error: metricError } = await supabase
      .from('scorecard_metric_values')
      .select(
        'metric_key,pillar,numeric_value,text_value,boolean_value,value_type,validation_state,validation_message,source_sheet,source_cell,source_range',
      )
      .eq('workbook_id', workbook.id)

    if (metricError) {
      throw new Error(metricError.message)
    }

    const result = runFullScorecardEngine((metricRows ?? []) as Parameters<typeof runFullScorecardEngine>[0])
    const warningCount = result.warnings.length
    const errorCount = result.errors.length

    const { error: resultError } = await supabase.from('scorecard_engine_results').insert({
      engine_run_id: runRow.id,
      workbook_id: workbook.id,
      company_id: company.id,
      engine_version: FULL_SCORECARD_ENGINE_VERSION,
      total_available_points: result.overall.totalAvailablePoints,
      total_score: result.overall.totalScore,
      bbbee_level: result.overall.bbbeeLevel,
      recognition_percentage: result.overall.recognitionPercentage,
      discounting_applicable: result.overall.discountingApplicable,
      result_json: result,
    })

    if (resultError) {
      throw new Error(resultError.message)
    }

    const runStatus =
      errorCount > 0
        ? 'failed'
        : warningCount > 0
          ? 'completed_with_warnings'
          : 'completed'

    const workbookStatus =
      errorCount > 0
        ? 'validation_failed'
        : warningCount > 0
          ? 'scored_with_warnings'
          : 'scored'

    await supabase
      .from('scorecard_engine_runs')
      .update({
        status: runStatus,
        completed_at: new Date().toISOString(),
        warnings_count: warningCount,
        errors_count: errorCount,
        metadata: {
          metric_row_count: metricRows?.length ?? 0,
        },
      })
      .eq('id', runRow.id)

    await supabase
      .from('scorecard_workbooks')
      .update({
        status: workbookStatus,
        engine_version: FULL_SCORECARD_ENGINE_VERSION,
        processed_at: new Date().toISOString(),
      })
      .eq('id', workbook.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[FULL-SCORECARD] Engine run failed', err)

    await supabase
      .from('scorecard_engine_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors_count: 1,
        metadata: { failure_message: message },
      })
      .eq('id', runRow.id)

    fail(companyId, 'Scoring engine failed. Check extracted metrics and try again.')
  }

  redirect(
    `/scorecards/full/new?companyId=${encodeURIComponent(company.id)}&workbookId=${encodeURIComponent(workbook.id)}`,
  )
}
