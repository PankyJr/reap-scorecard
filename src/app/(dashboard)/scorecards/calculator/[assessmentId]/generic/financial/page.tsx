import { notFound } from 'next/navigation'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { clearNpatOverride, overrideNpatDenominator, saveFinancialInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { Card } from '@/components/ui/Card'
import { Field, Flash, SaveButton, SelectField, Shell, formatRand } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaSection } from '../workspace'
import { sameAsWorkbook, workbookReading, workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { financialWarnings } from '@/lib/scorecard/generic/ux/sanity'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { PageHelpData } from '@/components/help/PageHelpData'

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Financial figures' }

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
  const warn = financialWarnings(f) as Record<string, string | undefined>
  const npat = preview.npat
  const targets = preview.contributionTargets
  const isAdmin = await isReapInternalAdmin(userId)
  const workflow = workflowForLoaded(loaded, 'financial')
  const reading = workbookReading(loaded)?.financial as Record<string, unknown> | undefined
  const tag = (field: keyof typeof f) => sameAsWorkbook(reading?.[field], f[field])
  const workspace = workspaceFor(loaded, workflow, 'financial')
  const base = `/scorecards/calculator/${assessmentId}/generic`
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
      workspace={workspace}
    >
      <Flash searchParams={query} />
      <PageHelpData
        page="area-financial"
        data={{
          npatEntered: f.actualNpat != null,
          marginEntered: f.industryNpatMargin != null,
          needsConfirmation: npat.requiresAuthorisedConfirmation,
          inputsHref: `${base}/financial#inputs`,
          next: workspace.next ? { label: workspace.next.label, href: workspace.next.href } : null,
          reviewHref: workspace.reviewHref,
        }}
      />

      <section className="space-y-3 rounded-card border border-line bg-surface p-5 sm:p-6" aria-live="polite" data-help="financial-targets">
        <h2 className="text-body font-semibold text-ink">Targets worked out from these figures</h2>
        {npat.applicableNpat == null ? (
          <p className="text-body text-label">
            Enter the <Term k="npat">net profit after tax</Term> below. Three areas measure their spend against it.
          </p>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-3">
              <li className="rounded-control bg-sunken px-3 py-2">
                <p className="text-meta text-label">Enterprise development{shareOfProfit(targets.enterpriseDevelopment)}</p>
                <p className="text-body font-semibold tabular-nums text-ink">{formatRand(targets.enterpriseDevelopment)}</p>
              </li>
              <li className="rounded-control bg-sunken px-3 py-2">
                <p className="text-meta text-label">Supplier development{shareOfProfit(targets.supplierDevelopment)}</p>
                <p className="text-body font-semibold tabular-nums text-ink">{formatRand(targets.supplierDevelopment)}</p>
              </li>
              <li className="rounded-control bg-sunken px-3 py-2">
                <p className="text-meta text-label">Socio-economic development{shareOfProfit(targets.socioEconomicDevelopment)}</p>
                <p className="text-body font-semibold tabular-nums text-ink">{formatRand(targets.socioEconomicDevelopment)}</p>
              </li>
            </ul>
            <p className="text-body text-label">
              Profit used: {formatRand(npat.applicableNpat)}. {npat.reason}
            </p>
          </>
        )}
        {npat.requiresAuthorisedConfirmation ? (
          <Notice tone="warn">A REAP administrator must confirm which profit figure to use before there is a final level.</Notice>
        ) : null}
      </section>

      <section id="inputs" aria-label="Figures">
        <AutoSaveForm action={saveFinancialInputs}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection helpId="financial-profit" title="Profit" description="From the annual financial statements for the year being measured." worth={null}>
            <Field
              label={<Term k="npat">Net profit after tax (R)</Term>}
              name="actualNpat" warning={warn.actualNpat}
              type="number"
              step="0.01"
              defaultValue={f.actualNpat}
              explain="Profit after tax for the year. Enter a loss as a negative number."
              source="the income statement in the annual financial statements"
              example="2 000 000"
              fromWorkbook={tag('actualNpat')}
            />
            <Field
              label="Revenue (R)"
              name="revenue"
              warning={warn.revenue}
              type="number"
              step="0.01"
              defaultValue={f.revenue}
              explain="Total income for the year. With the industry profit margin, it gives the deemed profit."
              source="the income statement in the annual financial statements"
              example="40 000 000"
              fromWorkbook={tag('revenue')}
            />
            <Field
              label="Profit before tax (R)"
              name="npbt"
              warning={warn.npbt}
              type="number"
              step="0.01"
              defaultValue={f.npbt}
              explain="Profit for the year before company tax."
              source="the income statement in the annual financial statements"
              example="2 800 000"
              fromWorkbook={tag('npbt')}
            />
            <Field
              label="Company tax (R)"
              name="companyTax"
              warning={warn.companyTax}
              type="number"
              step="0.01"
              defaultValue={f.companyTax}
              explain="The income tax charged for the year."
              source="the taxation note in the annual financial statements"
              example="800 000"
              fromWorkbook={tag('companyTax')}
            />
          </AreaSection>

          <AreaSection
            helpId="financial-payroll"
            title="Payroll and staff"
            description="For your records. Skills development and management control ask for their own payroll and staff figures on their pages."
            worth={null}
          >
            <Field
              label={<Term k="leviable">Leviable payroll (R)</Term>}
              name="leviableAmount" warning={warn.leviableAmount}
              type="number"
              step="0.01"
              defaultValue={f.leviableAmount}
              explain="The payroll the Skills Development Levy is worked out on."
              source="the EMP201 returns filed with SARS for the year"
              example="10 000 000"
              hint="Skills development is scored from the leviable amount on its own page; enter the same figure there."
              fromWorkbook={tag('leviableAmount')}
            />
            <Field
              label="Total payroll (R)"
              name="totalPayroll"
              warning={warn.totalPayroll}
              type="number"
              step="0.01"
              defaultValue={f.totalPayroll}
              explain="Everything paid to employees in the year."
              source="the employee costs note in the annual financial statements, or the payroll report"
              example="12 000 000"
              fromWorkbook={tag('totalPayroll')}
            />
            <Field
              label="All employees"
              name="totalEmployees"
              warning={warn.totalEmployees}
              type="number"
              step="1"
              defaultValue={f.totalEmployees}
              // TODO-VERIFY: the counting basis (headcount at year end or an average).
              explain="The number of people the company employs."
              source="the payroll report or the employment equity report"
              example="500"
              fromWorkbook={tag('totalEmployees')}
            />
          </AreaSection>

          <div data-help="financial-more">
          <MoreOptions label="More options: a small profit or a loss, and the year’s dates">
            <p className="text-body text-label">
              When profit is small or there is a loss, the targets are worked out from a typical profit for the industry instead
              (the <Term k="deemedNpat">deemed NPAT</Term>). Enter the industry’s profit margin and where it comes from. Without
              it, the profit figure needs a REAP administrator to confirm it before the level is final.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Industry profit margin (%)"
                name="industryNpatMargin" warning={warn.industryNpatMargin}
                type="number"
                step="0.0001"
                defaultValue={f.industryNpatMargin == null ? '' : Number((f.industryNpatMargin * 100).toFixed(6))}
                explain="The typical profit after tax, as a share of revenue, in the company’s industry."
                // TODO-VERIFY: which published source of industry margins a verification agency accepts.
                source="published industry statistics, such as Stats SA’s Annual Financial Statistics"
                example="5.73"
                fromWorkbook={tag('industryNpatMargin')}
              />
              <Field
                label="Industry"
                name="industryClassification"
                warning={warn.industryClassification}
                defaultValue={f.industryClassification}
                explain="The industry the margin is for."
                source="the same publication as the margin"
                example="Manufacturing"
                fromWorkbook={tag('industryClassification')}
              />
              <Field
                label="Where the margin comes from"
                name="industryProfitNormSource"
                warning={warn.industryProfitNormSource}
                defaultValue={f.industryProfitNormSource}
                explain="The name of the publication the margin is taken from."
                source="the publication’s title page"
                example="Stats SA Annual Financial Statistics"
                fromWorkbook={tag('industryProfitNormSource')}
              />
              <Field
                label="Which period it covers"
                name="industryProfitNormPeriod"
                warning={warn.industryProfitNormPeriod}
                defaultValue={f.industryProfitNormPeriod}
                explain="The year the margin was measured in."
                source="the same publication"
                example="2024"
                fromWorkbook={tag('industryProfitNormPeriod')}
              />
              <Field
                label="First day of the year"
                name="measurementPeriodStart"
                warning={warn.measurementPeriodStart}
                type="date"
                defaultValue={f.measurementPeriodStart}
                explain="Usually the same dates as on Company size and sector."
                source="the annual financial statements"
                example="1 March 2025"
              />
              <Field
                label="Last day of the year"
                name="measurementPeriodEnd"
                warning={warn.measurementPeriodEnd}
                type="date"
                defaultValue={f.measurementPeriodEnd}
                explain="The financial year end."
                source="the annual financial statements"
                example="28 February 2026"
              />
            </div>
          </MoreOptions>
          </div>
        </AutoSaveForm>
      </section>

      {isAdmin ? (
        <Card bodyClassName="space-y-4" title="Authorised profit override (REAP administrators only)" data-help="financial-override">
          <p className="text-meta text-label">
            Only a REAP administrator may fix which profit figure is used. The reason and the previous value are kept in the
            audit trail.
          </p>
          <form action={overrideNpatDenominator} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <SelectField
              label="Use"
              name="selection" warning={warn.selection}
              defaultValue={f.npatOverride?.selection ?? ''}
              hint="Which profit figure the targets are worked out from. For example: the industry-based profit, for a company that made a loss."
              options={[
                { value: 'actual', label: 'The actual profit' },
                { value: 'deemed', label: 'The industry-based profit' },
                { value: 'authorised_override', label: 'A figure I enter' },
              ]}
            />
            <Field
              label="Figure (R)"
              name="value"
              warning={warn.value}
              type="number"
              step="0.01"
              defaultValue={f.npatOverride?.value}
              explain="Only when “A figure I enter” is chosen."
              source="the working papers that support the figure"
              example="1 500 000"
            />
            <div className="sm:col-span-2">
              <Field
                label="Reason (required)"
                name="reason"
                warning={warn.reason}
                defaultValue={f.npatOverride?.reason}
                required
                explain="Why this figure is used. It is kept in the audit trail with the previous value."
                example="Loss year; deemed profit from the industry margin used"
              />
            </div>
            <div className="sm:col-span-2">
              <SaveButton label="Save the override" />
            </div>
          </form>
          {f.npatOverride ? (
            <form action={clearNpatOverride} className="pt-2">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <button type="submit" className="text-body font-medium text-bad hover:underline">
                Remove the override
              </button>
            </form>
          ) : null}
        </Card>
      ) : null}
    </Shell>
  )
}
