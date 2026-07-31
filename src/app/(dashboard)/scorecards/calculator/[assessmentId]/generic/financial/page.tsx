import { notFound } from 'next/navigation'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { clearNpatOverride, overrideNpatDenominator, saveFinancialInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { Card, Field, Flash, ResultSummary, SaveButton, SelectField, Shell, formatRand, FormCard} from '../ui'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FinancialPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, inputs, userId } = loaded
  const f = inputs.financial
  const npat = preview.npat
  const targets = preview.contributionTargets
  const isAdmin = await isReapInternalAdmin(userId)

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="financial"
      title="Shared financial inputs"
      subtitle="Enterprise Development, Supplier Development and Socio-Economic Development all use the same applicable NPAT denominator. The engine never silently chooses a value when the rule cannot be resolved confidently."
      aside={<ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />}
    >
      <Flash searchParams={query} />

      <Card title="Applicable NPAT denominator">
        <dl className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-slate-500">Actual NPAT</dt>
            <dd className="font-semibold text-slate-950">{formatRand(npat.actualNpat)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Deemed NPAT</dt>
            <dd className="font-semibold text-slate-950">{formatRand(npat.deemedNpat)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Selected denominator</dt>
            <dd className="font-semibold text-slate-950">{formatRand(npat.applicableNpat)}</dd>
          </div>
        </dl>
        <p className="text-sm text-slate-700">{npat.reason}</p>
        <p className="text-xs text-slate-500">
          Industry norm source: {npat.industryProfitNormSource ?? '—'} · Period:{' '}
          {npat.industryProfitNormPeriod ?? '—'} · Selection: {npat.selection}
        </p>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-slate-500">ED target (1%)</p>
            <p className="font-semibold">{formatRand(targets.enterpriseDevelopment)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-slate-500">SD target (2%)</p>
            <p className="font-semibold">{formatRand(targets.supplierDevelopment)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-slate-500">SED target (1%)</p>
            <p className="font-semibold">{formatRand(targets.socioEconomicDevelopment)}</p>
          </div>
        </div>
        {npat.requiresAuthorisedConfirmation ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
            This denominator requires authorised confirmation before a final level can be produced.
          </p>
        ) : null}
      </Card>

      <FormCard title="Capture financial inputs" action={saveFinancialInputs}>
          <div className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="assessmentId" value={assessmentId} />
          <Field label="Measurement period start" name="measurementPeriodStart" type="date" defaultValue={f.measurementPeriodStart} />
          <Field label="Measurement period end" name="measurementPeriodEnd" type="date" defaultValue={f.measurementPeriodEnd} />
          <Field label="Revenue (R)" name="revenue" type="number" step="0.01" defaultValue={f.revenue} />
          <Field label="Actual NPAT (R)" name="actualNpat" type="number" step="0.01" defaultValue={f.actualNpat} />
          <Field label="NPBT (R)" name="npbt" type="number" step="0.01" defaultValue={f.npbt} />
          <Field label="Company tax (R)" name="companyTax" type="number" step="0.01" defaultValue={f.companyTax} />
          <Field label="Leviable amount (R)" name="leviableAmount" type="number" step="0.01" defaultValue={f.leviableAmount} hint="Used by Skills Development" />
          <Field label="Total payroll (R)" name="totalPayroll" type="number" step="0.01" defaultValue={f.totalPayroll} />
          <Field label="Total employees" name="totalEmployees" type="number" step="1" defaultValue={f.totalEmployees} />
          <Field label="Industry classification" name="industryClassification" defaultValue={f.industryClassification} />
          <Field
            label="Industry NPAT margin %"
            name="industryNpatMargin"
            type="number"
            step="0.0001"
            defaultValue={f.industryNpatMargin == null ? '' : f.industryNpatMargin * 100}
            hint="Enter 5.73 for 5.73%. Deemed NPAT = revenue × margin × 25%."
          />
          <Field label="Industry profit norm source" name="industryProfitNormSource" defaultValue={f.industryProfitNormSource} />
          <Field label="Industry profit norm period" name="industryProfitNormPeriod" defaultValue={f.industryProfitNormPeriod} />
          </div>
        </FormCard>

      {isAdmin ? (
        <Card title="Authorised NPAT override">
          <p className="text-sm text-slate-600">
            Only a REAP administrator may pin the denominator. The reason and previous value are stored in the audit trail.
          </p>
          <form action={overrideNpatDenominator} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <SelectField
              label="Selection"
              name="selection"
              defaultValue={f.npatOverride?.selection ?? ''}
              options={[
                { value: 'actual', label: 'Use actual NPAT' },
                { value: 'deemed', label: 'Use deemed NPAT' },
                { value: 'authorised_override', label: 'Supply an explicit value' },
              ]}
            />
            <Field label="Explicit value (R)" name="value" type="number" step="0.01" defaultValue={f.npatOverride?.value} />
            <div className="sm:col-span-2">
              <Field label="Reason (required)" name="reason" defaultValue={f.npatOverride?.reason} required />
            </div>
            <div className="sm:col-span-2">
              <SaveButton label="Store authorised override" />
            </div>
          </form>
          {f.npatOverride ? (
            <form action={clearNpatOverride} className="pt-2">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <button type="submit" className="text-sm font-medium text-rose-700 hover:underline">
                Clear override
              </button>
            </form>
          ) : null}
        </Card>
      ) : null}
    </Shell>
  )
}
