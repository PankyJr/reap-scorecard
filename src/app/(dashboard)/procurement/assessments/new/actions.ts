'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import {
  calculateSupplierRow,
  type ProcurementSupplierWithCalculated,
} from '@/lib/procurement/rows'
import {
  aggregateCategoryTotals,
  calculateProcurementResults,
  toProcurementResultsRows,
} from '@/lib/procurement/assessment'
import {
  calculateProcurementTmpsTotals,
} from '@/lib/procurement/tmps'
import {
  assessmentPayloadSchema,
  parseSuppliersJsonFromForm,
  readTmpsFieldsFromFormData,
} from '@/lib/procurement/assessmentServerPayload'

/** Best-effort delete of the assessment row; cascades remove suppliers/results. */
async function rollbackProcurementAssessment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
  context: string,
) {
  const { error } = await supabase
    .from('procurement_assessments')
    .delete()
    .eq('id', assessmentId)

  if (error) {
    console.error('[PROCUREMENT] Rollback failed after partial create', {
      context,
      assessmentId,
      error,
    })
  }
}

function procurementCreateFailureRedirect(
  companyId: string,
  err: { message?: string } | null,
  fallback: string,
) {
  const friendly =
    err?.message && process.env.NODE_ENV === 'development'
      ? err.message
      : fallback
  const message = encodeURIComponent(friendly)
  redirect(
    `/procurement/assessments/new?companyId=${companyId}&error=${message}`,
  )
}

export async function createProcurementAssessment(formData: FormData) {
  const supabase = await createClient()

  const rawSuppliersJson = formData.get('suppliers_json') as string | null
  const company_id = formData.get('company_id') as string | null
  const assessment_year = formData.get('assessment_year') as string | null
  const tmpsInputs = readTmpsFieldsFromFormData(formData)
  const suppliersParsed = parseSuppliersJsonFromForm(rawSuppliersJson)
  const parsedSuppliers = suppliersParsed.ok ? suppliersParsed.data : []

  const parsed = assessmentPayloadSchema.safeParse({
    company_id,
    assessment_year,
    ...tmpsInputs,
    suppliers: parsedSuppliers,
  })

  if (!parsed.success) {
    const message = encodeURIComponent(
      'Please check your inputs and supplier rows.'
    )
    redirect(
      `/procurement/assessments/new?companyId=${company_id ?? ''}&error=${message}`
    )
  }

  const payload = parsed.data

  const { tmpsTotal } = calculateProcurementTmpsTotals(payload)

  if (tmpsTotal <= 0) {
    const message = encodeURIComponent('TMPS total must be greater than zero.')
    redirect(
      `/procurement/assessments/new?companyId=${payload.company_id}&error=${message}`,
    )
  }

  // Row-level calculations
  const calculatedSuppliers: ProcurementSupplierWithCalculated[] =
    payload.suppliers.map((row) => calculateSupplierRow(row))

  // Assessment-level calculations
  const totals = aggregateCategoryTotals(calculatedSuppliers)
  const result = calculateProcurementResults({
    totals,
    totalMeasuredSpend: tmpsTotal,
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Phase 1 compatibility rule:
  // - Legacy/unowned companies with owner_id IS NULL are denied for mutations.
  // - Otherwise allow only if the selected company is owned by the current user.
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, owner_id, name')
    .eq('id', payload.company_id)
    .single()

  if (companyError || !company || !company.owner_id || company.owner_id !== user.id) {
    const message = encodeURIComponent('Company not found.')
    redirect(
      `/procurement/assessments/new?companyId=${payload.company_id}&error=${message}`,
    )
  }

  // Insert assessment header
  const { data: assessment, error: assessmentError } = await supabase
    .from('procurement_assessments')
    .insert([
      {
        company_id: payload.company_id,
        assessment_year: payload.assessment_year,
        total_measured_procurement_spend: tmpsTotal,
        tmps_opening_inventory:
          payload.tmps_opening_inventory ?? null,
        tmps_closing_inventory:
          payload.tmps_closing_inventory ?? null,
        tmps_cost_of_sales: payload.tmps_cost_of_sales ?? null,
        tmps_other_operating_expenses:
          payload.tmps_other_operating_expenses ?? null,
        tmps_finance_costs: payload.tmps_finance_costs ?? null,
        tmps_capital_expenditure:
          payload.tmps_capital_expenditure ?? null,
        tmps_employee_costs:
          payload.tmps_employee_costs ?? null,
        tmps_depreciation: payload.tmps_depreciation ?? null,
        tmps_utilities: payload.tmps_utilities ?? null,
        tmps_service_fees: payload.tmps_service_fees ?? null,
        tmps_recharge_for_services:
          payload.tmps_recharge_for_services ?? null,
        tmps_purchase_of_goods:
          payload.tmps_purchase_of_goods ?? null,
        tmps_purchase_of_services:
          payload.tmps_purchase_of_services ?? null,
        total_score: result.totalScore,
        created_by: user?.id ?? null,
        status: 'draft',
      },
    ])
    .select()
    .single()

  if (assessmentError || !assessment) {
    console.error('[PROCUREMENT] Failed to create assessment', {
      payload,
      error: assessmentError,
    })
    const friendly =
      assessmentError?.message && process.env.NODE_ENV === 'development'
        ? assessmentError.message
        : 'Failed to save procurement assessment.'
    const message = encodeURIComponent(friendly)
    redirect(
      `/procurement/assessments/new?companyId=${payload.company_id}&error=${message}`
    )
  }

  // Insert suppliers
  const supplierRows = calculatedSuppliers.map((row) => ({
    assessment_id: assessment.id,
    supplier_name: row.supplier_name,
    supplier_code: row.supplier_code ?? null,
    vat_number: row.vat_number ?? null,
    company_registration: row.company_registration ?? null,
    bo_etc: row.bo_etc ?? null,
    fts: row.fts ?? null,
    des: row.des ?? null,
    prop: row.prop ?? null,
    supplier_type: row.supplier_type,
    level: row.level,
    recognition_percent: row.recognition_percent,
    value_ex_vat: row.value_ex_vat,
    bbbee_spend: row.bbbee_spend,
    is_51_black_owned: row.is_51_black_owned,
    is_30_black_women_owned: row.is_30_black_women_owned,
    is_51_bdgs: row.is_51_bdgs,
    eme_amount: row.eme_amount,
    qse_amount: row.qse_amount,
    black_owned_amount: row.black_owned_amount,
    black_women_amount: row.black_women_amount,
    bdgs_amount: row.bdgs_amount,
    expiry: row.expiry ? row.expiry : null,
    empower: row.empower ?? null,
  }))

  const { error: supplierError } = await supabase
    .from('procurement_suppliers')
    .insert(supplierRows)

  if (supplierError) {
    console.error('[PROCUREMENT] Failed to insert suppliers', {
      assessmentId: assessment.id,
      error: supplierError,
    })
    await rollbackProcurementAssessment(
      supabase,
      assessment.id,
      'supplier_insert_failed',
    )
    procurementCreateFailureRedirect(
      payload.company_id,
      supplierError,
      'Failed to save supplier rows. Nothing was kept—try again.',
    )
  }

  // Insert category results
  const resultsRows = toProcurementResultsRows(assessment.id, result)
  const { error: resultsError } = await supabase
    .from('procurement_results')
    .insert(resultsRows)

  if (resultsError) {
    console.error('[PROCUREMENT] Failed to insert procurement_results', {
      assessmentId: assessment.id,
      error: resultsError,
    })
    await rollbackProcurementAssessment(
      supabase,
      assessment.id,
      'procurement_results_insert_failed',
    )
    procurementCreateFailureRedirect(
      payload.company_id,
      resultsError,
      'Failed to save category results. Nothing was kept—try again.',
    )
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'procurement_assessment.created',
    entity_type: 'procurement_assessment',
    entity_id: assessment.id,
    entity_name: company.name
      ? `Procurement ${payload.assessment_year} · ${company.name}`
      : `Procurement ${payload.assessment_year}`,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    metadata: {
      company_id: company.id,
      company_name: company.name ?? null,
      assessment_year: payload.assessment_year,
      total_score: result.totalScore ?? null,
      supplier_count: supplierRows.length,
    },
  })

  if (auditError) {
    console.error(
      '[AUDIT] Failed to write audit log for procurement_assessment.created',
      {
        assessmentId: assessment.id,
        code: auditError.code,
        message: auditError.message,
        details: auditError.details,
      },
    )
  }

  revalidatePath('/dashboard')
  revalidatePath(`/companies/${payload.company_id}`)

  redirect(`/procurement/assessments/${assessment.id}`)
}

