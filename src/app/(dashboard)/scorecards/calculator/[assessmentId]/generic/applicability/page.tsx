import { notFound } from 'next/navigation'
import { saveApplicability } from '../actions'
import { loadGenericAssessment } from '../load'
import { Field, Flash, SelectField, Shell } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaSection } from '../workspace'
import { workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { describeCompanySize } from '@/lib/company/size'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const yesNo = (value: boolean | null | undefined) => (value == null ? '' : value ? 'yes' : 'no')

export default async function ApplicabilityPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, inputs } = loaded
  const a = inputs.applicability
  const result = preview.applicability
  const workflow = workflowForLoaded(loaded, 'applicability')
  const size = describeCompanySize({
    turnover: a.annualRevenue,
    blackOwnershipPercent: a.blackOwnershipPercentage == null ? null : a.blackOwnershipPercentage * 100,
  })
  const prefilled = (assessment as { metadata?: { prefilled_from?: { kind: string; year?: number } | null } | null }).metadata?.prefilled_from
  const pct = (value: number | null) => (value == null ? '' : Number((value * 100).toFixed(6)))

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="applicability"
      title="Company size and sector"
      subtitle={AREA_COPY.applicability.measures}
      workflow={workflow}
      workspace={workspaceFor(loaded, workflow, 'applicability')}
    >
      <Flash searchParams={query} />

      <section className="space-y-3 rounded-card border border-line bg-surface p-5 sm:p-6" aria-live="polite">
        <p className="text-base font-semibold text-ink">{size.headline}</p>
        {size.automaticLevel ? (
          <Notice tone="ok" title="You may not need a full scorecard">
            {size.automaticLevel.reason} Confirm with your verification agency.
          </Notice>
        ) : null}
        {result.blockingReasons.length > 0 ? (
          <Notice tone="warn" title="Why this scorecard cannot give a final level yet">
            <ul className="list-disc space-y-1 pl-5">
              {result.blockingReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </Notice>
        ) : null}
        {prefilled ? (
          <p className="text-[15px] text-muted">
            {prefilled.kind === 'previous_scorecard'
              ? `Filled in from the company’s ${prefilled.year} scorecard. Check each figure is right for this year.`
              : 'Filled in from the company’s details. Check each figure is right for this year.'}
          </p>
        ) : null}
      </section>

      <section id="inputs" className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <AutoSaveForm action={saveApplicability}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection title="The year being measured" description="Usually the company’s last financial year." worth={null}>
            <Field label="First day" name="measurementPeriodStart" type="date" defaultValue={a.measurementPeriodStart} example="1 March 2025" />
            <Field label="Last day" name="measurementPeriodEnd" type="date" defaultValue={a.measurementPeriodEnd} example="28 February 2026" />
          </AreaSection>

          <AreaSection title="Size and ownership" description="These decide which scorecard the company is measured on." worth={null}>
            <Field
              label="Annual turnover (R)"
              name="annualRevenue"
              type="number"
              step="0.01"
              defaultValue={a.annualRevenue}
              explain="Total income for the year being measured, before tax."
              example="30 000 000"
            />
            <Field
              label="Black ownership (%)"
              name="blackOwnershipPercentage"
              type="number"
              step="0.01"
              defaultValue={pct(a.blackOwnershipPercentage)}
              explain="The share of the company owned by black South Africans."
              example="51"
            />
            <Field
              label="Black women ownership (%)"
              name="blackWomenOwnershipPercentage"
              type="number"
              step="0.01"
              defaultValue={pct(a.blackWomenOwnershipPercentage)}
              explain="The share owned by black women."
              example="30"
            />
            <SelectField
              label="Is it a start-up?"
              name="isStartUp"
              defaultValue={yesNo(a.isStartUp)}
              hint="A company in its first year. Start-ups are measured as an EME."
              options={[
                { value: '', label: 'Not answered' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </AreaSection>

          <AreaSection title="Sector" description="Some industries are measured on their own sector code instead of the Generic codes." worth={null}>
            <Field label="Sector" name="sector" defaultValue={a.sector} explain="The industry the company works in." example="Manufacturing" />
            <SelectField
              label="Does a sector code apply to the company?"
              name="sectorCodeApplies"
              defaultValue={yesNo(a.sectorCodeApplies)}
              hint="If you are not sure, ask your verification agency."
              options={[
                { value: '', label: 'Not answered' },
                { value: 'no', label: 'No, the Generic codes apply' },
                { value: 'yes', label: 'Yes, a sector code applies' },
              ]}
            />
            <Field label="Which sector code" name="sectorCodeName" defaultValue={a.sectorCodeName} hint="Only when a sector code applies." example="ICT Sector Code" />
            <Field label="Type of entity" name="entityType" defaultValue={a.entityType} explain="Its legal form." example="Private company" />
          </AreaSection>

          <MoreOptions label="More options: an EME or QSE choosing the full scorecard">
            <p className="text-[15px] text-muted">
              An EME or QSE may choose to be measured on the full Generic scorecard instead of its automatic level. Record
              why, and the evidence; without both the choice is not accepted.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Choose the full scorecard?"
                name="fullScorecardElection"
                defaultValue={a.fullScorecardElection?.elected ? 'yes' : ''}
                options={[
                  { value: '', label: 'No' },
                  { value: 'yes', label: 'Yes' },
                ]}
              />
              <Field label="Why" name="electionReason" defaultValue={a.fullScorecardElection?.reason} />
              <Field label="Evidence" name="electionEvidence" defaultValue={a.fullScorecardElection?.evidence} />
            </div>
          </MoreOptions>
        </AutoSaveForm>
      </section>
    </Shell>
  )
}
