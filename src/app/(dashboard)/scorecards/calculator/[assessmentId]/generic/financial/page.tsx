import { notFound } from 'next/navigation'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { clearNpatOverride, overrideNpatDenominator, saveFinancialInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { Card, Field, Flash, SaveButton, SelectField, Shell, formatRand } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaSection } from '../workspace'
import { sameAsWorkbook, workbookReading, workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'

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
  const workflow = workflowForLoaded(loaded, 'financial')
  const reading = workbookReading(loaded)?.financial as Record<string, unknown> | undefined
  const tag = (field: keyof typeof f) => sameAsWorkbook(reading?.[field], f[field])
  // The share of profit each target is, from the engine's own figures.
  const shareOfProfit = (amount: number | null | undefined) =>
    amount != null && npat.applicableNpat ? ` (${Number(((amount / npat.applicableNpat) * 100).toFixed(2))}% of profit)` : ''

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="financial"
      title="Financial figures"
      subtitle={AREA_COPY.financial.measures}
      workflow={workflow}
      workspace={workspaceFor(loaded, workflow, 'financial')}
    >
      <Flash searchParams={query} />

      <section className="space-y-3 rounded-card border border-line bg-surface p-5 sm:p-6" aria-live="polite">
        <h2 className="text-base font-semibold text-ink">Targets worked out from these figures</h2>
        {npat.applicableNpat == null ? (
          <p className="text-[15px] text-muted">
            Enter the net profit after tax below. Three areas measure their spend against it.
          </p>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-3">
              <li className="rounded-control bg-sunken px-3 py-2">
                <p className="text-sm text-muted">Enterprise development{shareOfProfit(targets.enterpriseDevelopment)}</p>
                <p className="text-base font-semibold tabular-nums text-ink">{formatRand(targets.enterpriseDevelopment)}</p>
              </li>
              <li className="rounded-control bg-sunken px-3 py-2">
                <p className="text-sm text-muted">Supplier development{shareOfProfit(targets.supplierDevelopment)}</p>
                <p className="text-base font-semibold tabular-nums text-ink">{formatRand(targets.supplierDevelopment)}</p>
              </li>
              <li className="rounded-control bg-sunken px-3 py-2">
                <p className="text-sm text-muted">Socio-economic development{shareOfProfit(targets.socioEconomicDevelopment)}</p>
                <p className="text-base font-semibold tabular-nums text-ink">{formatRand(targets.socioEconomicDevelopment)}</p>
              </li>
            </ul>
            <p className="text-[15px] text-muted">
              Profit used: {formatRand(npat.applicableNpat)}. {npat.reason}
            </p>
          </>
        )}
        {npat.requiresAuthorisedConfirmation ? (
          <Notice tone="warn">A REAP administrator must confirm which profit figure to use before there is a final level.</Notice>
        ) : null}
      </section>

      <section id="inputs" className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <AutoSaveForm action={saveFinancialInputs}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection title="Profit" description="From the annual financial statements for the year being measured." worth={null}>
            <Field
              label={<Term k="npat">Net profit after tax (R)</Term>}
              name="actualNpat"
              type="number"
              step="0.01"
              defaultValue={f.actualNpat}
              explain="Profit after tax for the year. Enter a loss as a negative number."
              example="2 000 000"
              fromWorkbook={tag('actualNpat')}
            />
            <Field label="Revenue (R)" name="revenue" type="number" step="0.01" defaultValue={f.revenue} explain="Total income for the year." example="40 000 000" fromWorkbook={tag('revenue')} />
            <Field label="Profit before tax (R)" name="npbt" type="number" step="0.01" defaultValue={f.npbt} example="2 800 000" fromWorkbook={tag('npbt')} />
            <Field label="Company tax (R)" name="companyTax" type="number" step="0.01" defaultValue={f.companyTax} example="800 000" fromWorkbook={tag('companyTax')} />
          </AreaSection>

          <AreaSection title="Payroll and staff" description="Skills development is measured against payroll." worth={null}>
            <Field
              label="Leviable payroll (R)"
              name="leviableAmount"
              type="number"
              step="0.01"
              defaultValue={f.leviableAmount}
              explain="The payroll the skills levy is worked out on, from the EMP201."
              example="10 000 000"
              fromWorkbook={tag('leviableAmount')}
            />
            <Field label="Total payroll (R)" name="totalPayroll" type="number" step="0.01" defaultValue={f.totalPayroll} example="12 000 000" fromWorkbook={tag('totalPayroll')} />
            <Field label="All employees" name="totalEmployees" type="number" step="1" defaultValue={f.totalEmployees} example="500" fromWorkbook={tag('totalEmployees')} />
          </AreaSection>

          <MoreOptions label="More options: a small profit or a loss, and the year’s dates">
            <p className="text-[15px] text-muted">
              When profit is small or there is a loss, the targets can be worked out from a typical profit for the industry
              instead. Enter the industry’s profit margin and where it comes from.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Industry profit margin (%)"
                name="industryNpatMargin"
                type="number"
                step="0.0001"
                defaultValue={f.industryNpatMargin == null ? '' : Number((f.industryNpatMargin * 100).toFixed(6))}
                example="5.73"
                fromWorkbook={tag('industryNpatMargin')}
              />
              <Field label="Industry" name="industryClassification" defaultValue={f.industryClassification} example="Manufacturing" fromWorkbook={tag('industryClassification')} />
              <Field label="Where the margin comes from" name="industryProfitNormSource" defaultValue={f.industryProfitNormSource} fromWorkbook={tag('industryProfitNormSource')} />
              <Field label="Which period it covers" name="industryProfitNormPeriod" defaultValue={f.industryProfitNormPeriod} fromWorkbook={tag('industryProfitNormPeriod')} />
              <Field label="First day of the year" name="measurementPeriodStart" type="date" defaultValue={f.measurementPeriodStart} />
              <Field label="Last day of the year" name="measurementPeriodEnd" type="date" defaultValue={f.measurementPeriodEnd} />
            </div>
          </MoreOptions>
        </AutoSaveForm>
      </section>

      {isAdmin ? (
        <Card title="Authorised profit override (REAP administrators only)">
          <p className="text-sm text-muted">
            Only a REAP administrator may fix which profit figure is used. The reason and the previous value are kept in the
            audit trail.
          </p>
          <form action={overrideNpatDenominator} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <SelectField
              label="Use"
              name="selection"
              defaultValue={f.npatOverride?.selection ?? ''}
              options={[
                { value: 'actual', label: 'The actual profit' },
                { value: 'deemed', label: 'The industry-based profit' },
                { value: 'authorised_override', label: 'A figure I enter' },
              ]}
            />
            <Field label="Figure (R)" name="value" type="number" step="0.01" defaultValue={f.npatOverride?.value} />
            <div className="sm:col-span-2">
              <Field label="Reason (required)" name="reason" defaultValue={f.npatOverride?.reason} required />
            </div>
            <div className="sm:col-span-2">
              <SaveButton label="Save the override" />
            </div>
          </form>
          {f.npatOverride ? (
            <form action={clearNpatOverride} className="pt-2">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <button type="submit" className="text-sm font-medium text-bad hover:underline">
                Remove the override
              </button>
            </form>
          ) : null}
        </Card>
      ) : null}
    </Shell>
  )
}
