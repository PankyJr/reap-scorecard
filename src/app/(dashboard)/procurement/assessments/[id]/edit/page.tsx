import Link from 'next/link'
import { ArrowLeft, Calculator } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import {
  NewProcurementAssessmentForm,
  type ProcurementAssessmentFormInitial,
} from '../../new/NewProcurementAssessmentForm'
import {
  supplierFromDatabaseRow,
  type SupplierFormRow,
} from '@/lib/procurement/supplierFormRow'
import { updateProcurementAssessment } from '../actions'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
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
      expiry: r.expiry,
      empower: r.empower,
    }),
  )

  if (suppliers.length < 1) {
    suppliers = [emptySupplierRow()]
  }

  const initialData: ProcurementAssessmentFormInitial = {
    assessment_year: assessment.assessment_year ?? new Date().getFullYear(),
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white">
          <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <Link
                    href={`/procurement/assessments/${assessment.id}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    aria-label="Back to assessment"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Edit assessment
                    </span>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">
                      Edit Procurement Assessment
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px]">
                      Update TMPS, suppliers, and recognition inputs. Saving
                      recalculates scores and replaces stored supplier rows for
                      this assessment.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/60 px-4 py-2.5 sm:min-w-[210px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Company
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-950">
                  {company.name}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white">
          <div className="border-b border-slate-200/80 bg-white px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Assessment Setup
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              Procurement Input Form
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Editing assessment for{' '}
              <span className="font-medium text-slate-800">{company.name}</span>
              .
            </p>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="space-y-5">
              <InfoCard
                icon={Calculator}
                title="How edits are saved"
                description="Submitting replaces all supplier rows and category results for this assessment. TMPS is recomputed from your inclusions and exclusions, then procurement points are recalculated from the supplier mix."
              />

              <form
                id="edit-procurement-assessment-form"
                action={updateProcurementAssessment}
                className="space-y-8"
              >
                <input type="hidden" name="assessment_id" value={assessment.id} />
                <input type="hidden" name="company_id" value={company.id} />

                <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/40 p-3 sm:p-4 lg:p-5">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6">
                    <NewProcurementAssessmentForm
                      formId="edit-procurement-assessment-form"
                      initialError={error}
                      initialData={initialData}
                      submitLabel="Save changes & recalculate"
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
