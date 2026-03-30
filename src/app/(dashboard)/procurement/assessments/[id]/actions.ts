'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import {
  assessmentUpdatePayloadSchema,
  parseSuppliersJsonFromForm,
  readTmpsFieldsFromFormData,
} from '@/lib/procurement/assessmentServerPayload'
import {
  calculateSupplierRow,
  type ProcurementSupplierWithCalculated,
} from '@/lib/procurement/rows'
import {
  aggregateCategoryTotals,
  calculateProcurementResults,
  toProcurementResultsRows,
} from '@/lib/procurement/assessment'
import { calculateProcurementTmpsTotals } from '@/lib/procurement/tmps'

type CompanyEmbed = { id: string; name: string | null; owner_id: string | null }

function procurementEditFailureRedirect(
  assessmentId: string,
  err: { message?: string } | null,
  fallback: string,
): never {
  const friendly =
    err?.message && process.env.NODE_ENV === 'development'
      ? err.message
      : fallback
  const message = encodeURIComponent(friendly)
  redirect(
    `/procurement/assessments/${assessmentId}/edit?error=${message}`,
  )
}

export async function updateProcurementAssessment(formData: FormData) {
  const supabase = await createClient()
  const assessment_id = formData.get('assessment_id') as string | null
  const rawSuppliersJson = formData.get('suppliers_json') as string | null
  const company_id = formData.get('company_id') as string | null
  const assessment_year = formData.get('assessment_year') as string | null
  const tmpsInputs = readTmpsFieldsFromFormData(formData)
  const suppliersParsed = parseSuppliersJsonFromForm(rawSuppliersJson)
  const parsedSuppliers = suppliersParsed.ok ? suppliersParsed.data : []

  const parsed = assessmentUpdatePayloadSchema.safeParse({
    assessment_id,
    company_id,
    assessment_year,
    ...tmpsInputs,
    suppliers: parsedSuppliers,
  })

  if (!parsed.success) {
    const idCheck = z.string().uuid().safeParse(assessment_id)
    if (idCheck.success) {
      procurementEditFailureRedirect(
        idCheck.data,
        null,
        'Please check your inputs and supplier rows.',
      )
    }
    redirect('/companies')
  }

  const payload = parsed.data
  const { tmpsTotal } = calculateProcurementTmpsTotals(payload)

  if (tmpsTotal <= 0) {
    const message = encodeURIComponent('TMPS total must be greater than zero.')
    redirect(
      `/procurement/assessments/${payload.assessment_id}/edit?error=${message}`,
    )
  }

  const calculatedSuppliers: ProcurementSupplierWithCalculated[] =
    payload.suppliers.map((row) => calculateSupplierRow(row))

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

  const { data: assessment, error: assessmentFetchError } = await supabase
    .from('procurement_assessments')
    .select(
      `
      id,
      company_id,
      company:companies(id, name, owner_id)
    `,
    )
    .eq('id', payload.assessment_id)
    .single()

  if (assessmentFetchError || !assessment) {
    procurementEditFailureRedirect(
      payload.assessment_id,
      assessmentFetchError,
      'Assessment not found.',
    )
  }

  const company = firstEmbeddedRow(
    assessment.company as CompanyEmbed | CompanyEmbed[] | null | undefined,
  )

  if (
    !company ||
    company.owner_id !== user.id ||
    assessment.company_id !== payload.company_id ||
    company.id !== payload.company_id
  ) {
    procurementEditFailureRedirect(
      payload.assessment_id,
      null,
      'Assessment not found.',
    )
  }

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

  const { error: delResultsError } = await supabase
    .from('procurement_results')
    .delete()
    .eq('assessment_id', assessment.id)

  if (delResultsError) {
    console.error('[PROCUREMENT] Failed to clear procurement_results', {
      assessmentId: assessment.id,
      error: delResultsError,
    })
    procurementEditFailureRedirect(
      payload.assessment_id,
      delResultsError,
      'Could not update category results.',
    )
  }

  const { error: delSuppliersError } = await supabase
    .from('procurement_suppliers')
    .delete()
    .eq('assessment_id', assessment.id)

  if (delSuppliersError) {
    console.error('[PROCUREMENT] Failed to clear procurement_suppliers', {
      assessmentId: assessment.id,
      error: delSuppliersError,
    })
    procurementEditFailureRedirect(
      payload.assessment_id,
      delSuppliersError,
      'Could not update supplier rows.',
    )
  }

  const { error: updateError } = await supabase
    .from('procurement_assessments')
    .update({
      assessment_year: payload.assessment_year,
      total_measured_procurement_spend: tmpsTotal,
      tmps_opening_inventory: payload.tmps_opening_inventory ?? null,
      tmps_closing_inventory: payload.tmps_closing_inventory ?? null,
      tmps_cost_of_sales: payload.tmps_cost_of_sales ?? null,
      tmps_other_operating_expenses:
        payload.tmps_other_operating_expenses ?? null,
      tmps_finance_costs: payload.tmps_finance_costs ?? null,
      tmps_capital_expenditure: payload.tmps_capital_expenditure ?? null,
      tmps_employee_costs: payload.tmps_employee_costs ?? null,
      tmps_depreciation: payload.tmps_depreciation ?? null,
      tmps_utilities: payload.tmps_utilities ?? null,
      tmps_service_fees: payload.tmps_service_fees ?? null,
      tmps_recharge_for_services: payload.tmps_recharge_for_services ?? null,
      tmps_purchase_of_goods: payload.tmps_purchase_of_goods ?? null,
      tmps_purchase_of_services: payload.tmps_purchase_of_services ?? null,
      total_score: result.totalScore,
      status: 'draft',
    })
    .eq('id', assessment.id)

  if (updateError) {
    console.error('[PROCUREMENT] Failed to update assessment', {
      assessmentId: assessment.id,
      error: updateError,
    })
    procurementEditFailureRedirect(
      payload.assessment_id,
      updateError,
      'Failed to save procurement assessment.',
    )
  }

  const { error: supplierError } = await supabase
    .from('procurement_suppliers')
    .insert(supplierRows)

  if (supplierError) {
    console.error('[PROCUREMENT] Failed to insert suppliers after edit', {
      assessmentId: assessment.id,
      error: supplierError,
    })
    procurementEditFailureRedirect(
      payload.assessment_id,
      supplierError,
      'Failed to save supplier rows.',
    )
  }

  const resultsRows = toProcurementResultsRows(assessment.id, result)
  const { error: resultsError } = await supabase
    .from('procurement_results')
    .insert(resultsRows)

  if (resultsError) {
    console.error('[PROCUREMENT] Failed to insert procurement_results', {
      assessmentId: assessment.id,
      error: resultsError,
    })
    procurementEditFailureRedirect(
      payload.assessment_id,
      resultsError,
      'Failed to save category results.',
    )
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'procurement_assessment.updated',
    entity_type: 'procurement_assessment',
    entity_id: assessment.id,
    entity_name: company.name
      ? `Procurement ${payload.assessment_year} · ${company.name}`
      : `Procurement ${payload.assessment_year}`,
    actor_id: user.id,
    actor_email: user.email ?? null,
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
      '[AUDIT] Failed to write audit log for procurement_assessment.updated',
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
  revalidatePath(`/procurement/assessments/${assessment.id}`)
  revalidatePath(`/procurement/assessments/${assessment.id}/edit`)
  revalidatePath(`/procurement/assessments/${assessment.id}/report`)

  redirect(`/procurement/assessments/${assessment.id}`)
}

export type DeleteProcurementAssessmentResult = { error: string } | void

const deleteAssessmentIdSchema = z.string().uuid()

export async function deleteProcurementAssessment(
  assessmentId: string,
): Promise<DeleteProcurementAssessmentResult> {
  const parsed = deleteAssessmentIdSchema.safeParse(assessmentId)
  if (!parsed.success) {
    return { error: 'Invalid assessment.' }
  }

  const supabase = await createClient()

  const { data: assessment, error: fetchError } = await supabase
    .from('procurement_assessments')
    .select(
      `
        id,
        company_id,
        assessment_year,
        total_score,
        company:companies(name, owner_id)
      `,
    )
    .eq('id', parsed.data)
    .single()

  if (fetchError || !assessment) {
    return {
      error:
        process.env.NODE_ENV === 'development'
          ? (fetchError?.message ?? 'Assessment not found.')
          : 'Could not delete procurement assessment.',
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const company = firstEmbeddedRow(
    assessment.company as CompanyEmbed | CompanyEmbed[] | null | undefined,
  )
  const isOwner = !!user?.id && company?.owner_id === user.id

  if (!isOwner) {
    return {
      error:
        process.env.NODE_ENV === 'development'
          ? 'Assessment not found.'
          : 'Could not delete procurement assessment.',
    }
  }

  const companyName = company?.name ?? null
  const entityName = companyName
    ? `Procurement ${assessment.assessment_year ?? '—'} · ${companyName}`
    : `Procurement (${parsed.data})`

  let auditFailed = false
  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'procurement_assessment.deleted',
    entity_type: 'procurement_assessment',
    entity_id: assessment.id,
    entity_name: entityName,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    metadata: {
      company_id: assessment.company_id,
      company_name: companyName,
      assessment_year: assessment.assessment_year ?? null,
      total_score: assessment.total_score ?? null,
    },
  })

  if (auditError) {
    auditFailed = true
    console.error(
      '[AUDIT] Failed to write audit log for procurement_assessment.deleted',
      {
        assessmentId: assessment.id,
        code: auditError.code,
        message: auditError.message,
        details: auditError.details,
      },
    )
  }

  const { error: deleteError } = await supabase
    .from('procurement_assessments')
    .delete()
    .eq('id', parsed.data)

  if (deleteError) {
    console.error('[PROCUREMENT] Failed to delete assessment', {
      assessmentId: parsed.data,
      errorMessage: deleteError.message,
    })
    return {
      error:
        process.env.NODE_ENV === 'development'
          ? deleteError.message
          : 'Could not delete procurement assessment.',
    }
  }

  revalidatePath(`/companies/${assessment.company_id}`)
  revalidatePath('/dashboard')
  revalidatePath('/procurement/assessments/new')

  redirect(
    auditFailed
      ? `/companies/${assessment.company_id}?procurement_deleted=1&audit_failed=1`
      : `/companies/${assessment.company_id}?procurement_deleted=1`,
  )
}
