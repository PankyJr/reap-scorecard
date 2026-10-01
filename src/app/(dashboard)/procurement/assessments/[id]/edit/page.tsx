import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import {
  NewProcurementAssessmentForm,
  type ProcurementAssessmentFormInitial,
} from '../../new/NewProcurementAssessmentForm'
import { parseTmpsCustomLinesFromUnknown } from '@/lib/procurement/tmpsCustom'
import { parseTmpsDenominatorSource } from '@/lib/procurement/tmpsDenominator'
import {
  supplierFromDatabaseRow,
  type SupplierFormRow,
} from '@/lib/procurement/supplierFormRow'
import { updateProcurementAssessment } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

function emptySupplierRow(): SupplierFormRow {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `new-${Date.now().toString(36)}`
  return {
    id,
    supplier_name: '',
    supplier_code: '',
    vat_number: '',
    company_registration: '',
    bo_etc: '',
    fts: '',
    des: '',
    prop: '',
    supplier_type: 'Generic',
    level: 'Non-Compliant',
    value_ex_vat: 0,
    is_51_black_owned: false,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    is_51_percent_flow_through: false,
    expiry: '',
    empower: '',
  }
}

export default async function EditProcurementAssessmentPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assessment } = await supabase
    .from('procurement_assessments')
    .select(
      `
      *,
      company:companies(*)
    `,
    )
    .eq('id', id)
    .single()

  type CompanyRow = { id: string; name: string; owner_id: string | null }
  const company = firstEmbeddedRow(
    assessment?.company as CompanyRow | CompanyRow[] | null | undefined,
  )

  if (!assessment || !company || company.owner_id !== user.id) {
    notFound()
  }

  const { data: supplierRows } = await supabase
    .from('procurement_suppliers')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('created_at', { ascending: true })

  let suppliers = (supplierRows ?? []).map((r) =>
    supplierFromDatabaseRow({
      id: r.id,
      supplier_name: r.supplier_name,
      supplier_code: r.supplier_code,
      vat_number: r.vat_number,
      company_registration: r.company_registration,
      bo_etc: r.bo_etc,
      fts: r.fts,
      des: r.des,
      prop: r.prop,
      supplier_type: r.supplier_type,
      level: r.level,
      value_ex_vat: r.value_ex_vat,
      is_51_black_owned: r.is_51_black_owned,
      is_30_black_women_owned: r.is_30_black_women_owned,
      is_51_bdgs: r.is_51_bdgs,
      is_51_percent_flow_through: r.is_51_percent_flow_through,
      expiry: r.expiry,
      empower: r.empower,
    }),
  )

  if (suppliers.length < 1) {
    suppliers = [emptySupplierRow()]
  }

  const assessmentImport = assessment as {
    import_workbook_name?: string | null
    import_sheet_name?: string | null
    tmps_denominator_source?: string | null
    tmps_manual_amount?: number | string | null
  }

  const manualAmtRaw = assessmentImport.tmps_manual_amount
  const tmpsManualAmountParsed =
    manualAmtRaw != null && manualAmtRaw !== ''
      ? Number(manualAmtRaw)
      : null

  const rawTmpsSource = parseTmpsDenominatorSource(
    assessmentImport.tmps_denominator_source,
  )
  const supplierSpendSum = suppliers.reduce(
    (s, r) => s + (Number(r.value_ex_vat) || 0),
    0,
  )
  const tmpsDenominatorSource =
    rawTmpsSource === 'manual'
      ? supplierSpendSum > 0
        ? 'import_supplier_total'
        : 'calculated'
      : rawTmpsSource

  const initialData: ProcurementAssessmentFormInitial = {
    assessment_year: assessment.assessment_year ?? new Date().getFullYear(),
    import_workbook_name: assessmentImport.import_workbook_name,
    import_sheet_name: assessmentImport.import_sheet_name,
    tmpsDenominatorSource,
    tmpsManualAmount:
      tmpsManualAmountParsed != null &&
      Number.isFinite(tmpsManualAmountParsed) &&
      tmpsManualAmountParsed > 0
        ? tmpsManualAmountParsed
        : null,
    tmpsCustomInclusions: parseTmpsCustomLinesFromUnknown(
      (assessment as { tmps_custom_inclusions?: unknown })
        .tmps_custom_inclusions,
    ),
    tmpsCustomExclusions: parseTmpsCustomLinesFromUnknown(
      (assessment as { tmps_custom_exclusions?: unknown })
        .tmps_custom_exclusions,
    ),
    tmps: {
      tmps_opening_inventory: assessment.tmps_opening_inventory,
      tmps_closing_inventory: assessment.tmps_closing_inventory,
      tmps_cost_of_sales: assessment.tmps_cost_of_sales,
      tmps_other_operating_expenses: assessment.tmps_other_operating_expenses,
      tmps_finance_costs: assessment.tmps_finance_costs,
      tmps_capital_expenditure: assessment.tmps_capital_expenditure,
      tmps_employee_costs: assessment.tmps_employee_costs,
      tmps_depreciation: assessment.tmps_depreciation,
      tmps_utilities: assessment.tmps_utilities,
      tmps_service_fees: assessment.tmps_service_fees,
      tmps_recharge_for_services: assessment.tmps_recharge_for_services,
      tmps_purchase_of_goods: assessment.tmps_purchase_of_goods,
      tmps_purchase_of_services: assessment.tmps_purchase_of_services,
    },
    suppliers,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: 'Companies', href: '/companies' },
          { label: company.name, href: `/companies/${company.id}` },
          { label: `Procurement ${assessment.assessment_year}`, href: `/procurement/assessments/${assessment.id}` },
          { label: 'Edit' },
        ]}
        title={`Edit procurement scorecard ${assessment.assessment_year}`}
        description="Change the total spend or the suppliers. Saving works the score out again. A full scorecard this is attached to keeps its copy until you attach it again."
      />
      <form id="edit-procurement-assessment-form" action={updateProcurementAssessment}>
        <input type="hidden" name="assessment_id" value={assessment.id} />
        <input type="hidden" name="company_id" value={company.id} />
        <NewProcurementAssessmentForm
          formId="edit-procurement-assessment-form"
          initialError={error}
          initialData={initialData}
          submitLabel="Save changes"
        />
      </form>
    </div>
  )
}
