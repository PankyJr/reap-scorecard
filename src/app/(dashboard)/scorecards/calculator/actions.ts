'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { resolveSelectedElements } from '@/lib/scorecard/calculator/assessment/scope'
import { getScorecardElementAdapter, isScorecardElementKey } from '@/lib/scorecard/calculator/elements/registry'
import type { AssessmentScopeMode, ElementWorkStatus, ScorecardElementKey } from '@/lib/scorecard/calculator/types'
import { SED_SUGGESTED_TARGET_PERCENT } from '@/lib/scorecard/calculator/rules/sed-beneficiary-v1'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 180)
}

async function requireOwnedCompany(companyId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', companyId)
    .maybeSingle()

  if (error || !company || company.owner_id !== user.id) {
    return { supabase, user, company: null as null }
  }
  return { supabase, user, company }
}

export async function createScorecardAssessment(formData: FormData) {

  const companyId = String(formData.get('companyId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const measurementYear = Number(formData.get('measurementYear'))
  const scopeMode = String(formData.get('scopeMode') ?? '') as AssessmentScopeMode
  const status = String(formData.get('status') ?? 'draft') === 'final' ? 'final' : 'draft'
  const notes = String(formData.get('notes') ?? '').trim() || null
  const selectedRaw = formData.getAll('selectedElements').map(String)

  if (!companyId) redirect('/scorecards/new?error=Select+a+company')
  if (!name) redirect(`/scorecards/new?companyId=${companyId}&error=Assessment+name+is+required`)
  if (!Number.isFinite(measurementYear) || measurementYear < 2000 || measurementYear > 2100) {
    redirect(`/scorecards/new?companyId=${companyId}&error=Invalid+measurement+year`)
  }
  if (!['full', 'single', 'selected'].includes(scopeMode)) {
    redirect(`/scorecards/new?companyId=${companyId}&error=Invalid+scope`)
  }

  const resolved = resolveSelectedElements({ scopeMode, selectedElements: selectedRaw })
  if (!resolved.ok) {
    redirect(`/scorecards/new?companyId=${companyId}&error=${encodeURIComponent(resolved.error)}`)
  }

  const { supabase, user, company } = await requireOwnedCompany(companyId)
  if (!company) redirect('/scorecards/new?error=Company+not+found')

  const { data: assessment, error } = await supabase
    .from('scorecard_assessments')
    .insert({
      company_id: companyId,
      created_by: user.id,
      name,
      measurement_year: measurementYear,
      status,
      scope_mode: scopeMode,
      selected_elements: resolved.elements,
      rule_version: 'calculator-v1',
      notes,
      metadata: { product_name: 'Full Scorecard Calculator' },
    })
    .select('id')
    .single()

  if (error || !assessment) {
    console.error('createScorecardAssessment', error)
    redirect(`/scorecards/new?companyId=${companyId}&error=Could+not+create+assessment`)
  }

  const elementRows = resolved.elements.map((element_key) => ({
    assessment_id: assessment.id,
    element_key,
    status: 'not_started' as ElementWorkStatus,
    contextual_inputs:
      element_key === 'socio_economic_development'
        ? { targetPercent: SED_SUGGESTED_TARGET_PERCENT, availablePoints: 5 }
        : {},
  }))

  const { error: elError } = await supabase.from('scorecard_assessment_elements').insert(elementRows)
  if (elError) {
    console.error('createScorecardAssessment elements', elError)
    redirect(`/scorecards/new?companyId=${companyId}&error=Could+not+create+element+rows`)
  }

  revalidatePath(`/scorecards/calculator/${assessment.id}`)
  redirect(`/scorecards/calculator/${assessment.id}`)
}

export async function uploadElementWorkbook(formData: FormData) {

  const assessmentId = String(formData.get('assessmentId') ?? '')
  const elementKey = String(formData.get('elementKey') ?? '')
  const file = formData.get('file')

  if (!assessmentId || !isScorecardElementKey(elementKey)) {
    redirect('/scorecards/new?error=Invalid+upload')
  }
  if (!(file instanceof File)) {
    redirect(`/scorecards/calculator/${assessmentId}/elements/${elementKey}?error=Choose+a+workbook+file`)
  }

  const lower = file.name.toLowerCase()
  if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
    redirect(
      `/scorecards/calculator/${assessmentId}/elements/${elementKey}?error=Unsupported+format.+Upload+.xlsx`,
    )
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    redirect(`/scorecards/calculator/${assessmentId}/elements/${elementKey}?error=File+size+invalid+or+too+large`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assessment } = await supabase
    .from('scorecard_assessments')
    .select('id, company_id, companies!inner(owner_id)')
    .eq('id', assessmentId)
    .maybeSingle()

  // Ownership check via company join may vary by PostgREST shape; fall back:
  const { data: owned } = await supabase
    .from('scorecard_assessments')
    .select('id, company_id')
    .eq('id', assessmentId)
    .maybeSingle()
  if (!owned) redirect('/scorecards/new?error=Assessment+not+found')

  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', owned.company_id)
    .maybeSingle()
  if (!company || company.owner_id !== user.id) redirect('/scorecards/new?error=Unauthorised')

  const buffer = Buffer.from(await file.arrayBuffer())
  const adapter = getScorecardElementAdapter(elementKey as ScorecardElementKey)

  let preview
  try {
    preview = adapter.parseWorkbook({ workbookBuffer: buffer })
  } catch {
    redirect(
      `/scorecards/calculator/${assessmentId}/elements/${elementKey}?error=Could+not+read+workbook.+Password-protected+or+corrupt+files+are+not+supported.`,
    )
  }

  if (!preview.sheetName || (preview.rows.length === 0 && preview.notes.length > 0 && !preview.detectedHeaders)) {
    // still persist preview notes
  }

  let status: ElementWorkStatus
  if (!adapter.scoringReady && preview.rows.length > 0) {
    status = 'needs_review'
  } else if (preview.rejectedRowCount > 0 || preview.validRowCount === 0) {
    status = preview.rows.length > 0 ? 'needs_review' : 'error'
  } else if (preview.warningCount > 0) {
    status = 'needs_review'
  } else {
    status = 'ready_to_calculate'
  }

  const { error } = await supabase
    .from('scorecard_assessment_elements')
    .update({
      upload_filename: sanitizeFilename(file.name),
      sheet_name: preview.sheetName || null,
      import_snapshot: preview,
      status,
      needs_recalculation: true,
      result_snapshot: null,
      calculated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)

  if (error) {
    console.error('uploadElementWorkbook', error)
    redirect(`/scorecards/calculator/${assessmentId}/elements/${elementKey}?error=Could+not+save+import`)
  }

  await supabase
    .from('scorecard_assessments')
    .update({ needs_recalculation: true, updated_at: new Date().toISOString() })
    .eq('id', assessmentId)

  void assessment
  revalidatePath(`/scorecards/calculator/${assessmentId}`)
  revalidatePath(`/scorecards/calculator/${assessmentId}/elements/${elementKey}`)
  redirect(`/scorecards/calculator/${assessmentId}/elements/${elementKey}?imported=1`)
}

export async function updateElementContextualInputs(formData: FormData) {

  const assessmentId = String(formData.get('assessmentId') ?? '')
  const elementKey = String(formData.get('elementKey') ?? '')
  if (!assessmentId || !isScorecardElementKey(elementKey)) redirect('/scorecards/new')

  const npatAmountRaw = String(formData.get('npatAmount') ?? '').trim()
  const targetPercentRaw = String(formData.get('targetPercent') ?? '').trim()
  const availablePointsRaw = String(formData.get('availablePoints') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim() || null

  const contextual_inputs: Record<string, number | string | null> = { notes }
  if (npatAmountRaw) contextual_inputs.npatAmount = Number(npatAmountRaw.replace(/[,\s]/g, ''))
  if (targetPercentRaw) {
    const t = Number(targetPercentRaw)
    contextual_inputs.targetPercent = t > 1 ? t / 100 : t
  }
  if (availablePointsRaw) contextual_inputs.availablePoints = Number(availablePointsRaw)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('scorecard_assessment_elements')
    .update({
      contextual_inputs,
      needs_recalculation: true,
      updated_at: new Date().toISOString(),
    })
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)

  await supabase
    .from('scorecard_assessments')
    .update({ needs_recalculation: true, updated_at: new Date().toISOString() })
    .eq('id', assessmentId)

  revalidatePath(`/scorecards/calculator/${assessmentId}/elements/${elementKey}`)
  redirect(`/scorecards/calculator/${assessmentId}/elements/${elementKey}?saved=1`)
}

export async function calculateElement(formData: FormData) {

  const assessmentId = String(formData.get('assessmentId') ?? '')
  const elementKey = String(formData.get('elementKey') ?? '')
  if (!assessmentId || !isScorecardElementKey(elementKey)) redirect('/scorecards/new')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: element } = await supabase
    .from('scorecard_assessment_elements')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)
    .maybeSingle()

  if (!element) redirect(`/scorecards/calculator/${assessmentId}?error=Element+not+found`)

  const adapter = getScorecardElementAdapter(elementKey)
  if (!adapter.scoringReady) {
    redirect(
      `/scorecards/calculator/${assessmentId}/elements/${elementKey}?error=Verified+scoring+is+not+available+for+this+element`,
    )
  }
  const rows = (element.import_snapshot as { rows?: unknown })?.rows
  const importRows = Array.isArray(rows) ? rows : []
  const contextualInputs = (element.contextual_inputs ?? {}) as Record<string, unknown>

  const result = adapter.calculate({
    rows: importRows as never,
    contextualInputs: contextualInputs as never,
  })

  const status: ElementWorkStatus =
    result.pointsAchieved != null ? 'calculated' : adapter.scoringReady ? 'needs_review' : 'needs_review'

  await supabase
    .from('scorecard_assessment_elements')
    .update({
      result_snapshot: result,
      calculation_rule_version: result.ruleVersion,
      calculated_at: new Date().toISOString(),
      calculated_by: user.id,
      needs_recalculation: false,
      status,
      warnings: result.warnings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', element.id)

  await supabase.from('scorecard_calculation_runs').insert({
    assessment_id: assessmentId,
    element_key: elementKey,
    created_by: user.id,
    rule_version: result.ruleVersion,
    status: 'completed',
    input_snapshot: {
      import_snapshot: element.import_snapshot,
      contextual_inputs: contextualInputs,
    },
    result_snapshot: result,
    warnings: result.warnings,
  })

  // Snapshot active EAP target set values when present so later admin edits do not alter history.
  const { data: assessmentRow } = await supabase
    .from('scorecard_assessments')
    .select('id, eap_target_set_id, eap_target_snapshot')
    .eq('id', assessmentId)
    .maybeSingle()

  let eapSnapshot = assessmentRow?.eap_target_snapshot ?? null
  if (assessmentRow?.eap_target_set_id && !eapSnapshot) {
    const { data: targetSet } = await supabase
      .from('eap_target_sets')
      .select('id, name, year, version, geography, status')
      .eq('id', assessmentRow.eap_target_set_id)
      .maybeSingle()
    const { data: values } = await supabase
      .from('eap_target_set_values')
      .select('band_key, demographic_key, target_value')
      .eq('target_set_id', assessmentRow.eap_target_set_id)
    if (targetSet) {
      eapSnapshot = {
        ...targetSet,
        values: values ?? [],
        snapped_at: new Date().toISOString(),
      }
    }
  }

  await supabase
    .from('scorecard_assessments')
    .update({
      needs_recalculation: false,
      updated_at: new Date().toISOString(),
      ...(eapSnapshot ? { eap_target_snapshot: eapSnapshot } : {}),
    })
    .eq('id', assessmentId)

  revalidatePath(`/scorecards/calculator/${assessmentId}`)
  revalidatePath(`/scorecards/calculator/${assessmentId}/elements/${elementKey}`)
  redirect(`/scorecards/calculator/${assessmentId}/elements/${elementKey}?calculated=1`)
}

export async function updateImportedSedRow(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const elementKey = String(formData.get('elementKey') ?? '')
  const sourceRowNumber = Number(formData.get('sourceRowNumber'))
  const recognisedAmountRaw = String(formData.get('recognisedAmount') ?? '').trim()
  const beneficiary = String(formData.get('beneficiary') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!assessmentId || elementKey !== 'socio_economic_development' || !Number.isFinite(sourceRowNumber)) {
    redirect('/scorecards/new?error=Invalid+row+edit')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: element } = await supabase
    .from('scorecard_assessment_elements')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)
    .maybeSingle()

  if (!element?.import_snapshot) {
    redirect(`/scorecards/calculator/${assessmentId}/elements/${elementKey}?error=No+import+to+edit`)
  }

  const preview = element.import_snapshot as {
    rows: Array<{
      sourceRowNumber: number
      values: Record<string, string | number | null>
      validationStatus: string
      validationMessages: string[]
    }>
    platformTotalRecognised?: number | null
    workbookDisplayedTotal?: number | null
    totalsMatch?: boolean | null
    [key: string]: unknown
  }

  const amount = Number(recognisedAmountRaw.replace(/[,\sR$]/gi, ''))
  if (!Number.isFinite(amount) || amount < 0) {
    redirect(
      `/scorecards/calculator/${assessmentId}/elements/${elementKey}?error=Recognised+amount+must+be+a+non-negative+number`,
    )
  }

  const rows = preview.rows.map((row) => {
    if (row.sourceRowNumber !== sourceRowNumber) return row
    return {
      ...row,
      values: {
        ...row.values,
        beneficiary: beneficiary || row.values.beneficiary,
        recognisedAmount: amount,
        notes: notes || null,
      },
      validationStatus: 'valid' as const,
      validationMessages: ['Manually corrected — recalculation required.'],
    }
  })

  const platformTotalRecognised = rows
    .filter((row) => row.validationStatus === 'valid')
    .reduce((sum, row) => sum + (typeof row.values.recognisedAmount === 'number' ? row.values.recognisedAmount : 0), 0)

  const nextSnapshot = {
    ...preview,
    rows,
    platformTotalRecognised,
    totalsMatch:
      preview.workbookDisplayedTotal == null
        ? null
        : preview.workbookDisplayedTotal === platformTotalRecognised,
    notes: [
      ...((preview.notes as string[] | undefined) ?? []),
      `Row ${sourceRowNumber} manually corrected at ${new Date().toISOString()}.`,
    ],
  }

  const corrections = {
    ...(typeof element.corrections === 'object' && element.corrections ? element.corrections : {}),
    [`row_${sourceRowNumber}`]: {
      recognisedAmount: amount,
      beneficiary,
      notes,
      corrected_at: new Date().toISOString(),
      corrected_by: user.id,
    },
  }

  await supabase
    .from('scorecard_assessment_elements')
    .update({
      import_snapshot: nextSnapshot,
      corrections,
      needs_recalculation: true,
      status: 'needs_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', element.id)

  await supabase
    .from('scorecard_assessments')
    .update({ needs_recalculation: true, updated_at: new Date().toISOString() })
    .eq('id', assessmentId)

  revalidatePath(`/scorecards/calculator/${assessmentId}`)
  revalidatePath(`/scorecards/calculator/${assessmentId}/elements/${elementKey}`)
  redirect(`/scorecards/calculator/${assessmentId}/elements/${elementKey}?edited=1`)
}

export async function attachActiveEapTargetSet(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  if (!assessmentId) redirect('/scorecards/new')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assessment } = await supabase
    .from('scorecard_assessments')
    .select('id, company_id, measurement_year')
    .eq('id', assessmentId)
    .maybeSingle()
  if (!assessment) redirect('/scorecards/new?error=Assessment+not+found')

  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', assessment.company_id)
    .maybeSingle()
  if (!company || company.owner_id !== user.id) redirect('/scorecards/new?error=Unauthorised')

  const { data: activeSet } = await supabase
    .from('eap_target_sets')
    .select('id')
    .eq('status', 'active')
    .eq('year', assessment.measurement_year)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase
    .from('scorecard_assessments')
    .update({
      eap_target_set_id: activeSet?.id ?? null,
      // Clear snapshot so the next explicit calculation captures current active values.
      eap_target_snapshot: null,
      needs_recalculation: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)

  revalidatePath(`/scorecards/calculator/${assessmentId}`)
  redirect(`/scorecards/calculator/${assessmentId}?eap=1`)
}
