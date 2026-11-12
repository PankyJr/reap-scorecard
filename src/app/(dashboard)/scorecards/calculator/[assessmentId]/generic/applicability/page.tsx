import { notFound } from 'next/navigation'
import { saveApplicability } from '../actions'
import { loadGenericAssessment } from '../load'
import { Field, Flash, SelectField, Shell } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaSection } from '../workspace'
import { workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Notice'
import { applicabilityWarnings } from '@/lib/scorecard/generic/ux/sanity'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { describeCompanySize } from '@/lib/company/size'
import { Term } from '@/components/ui/Term'
import { PageHelpData } from '@/components/help/PageHelpData'

/** The engine's names for missing answers, in this page's words (for page help). */
const MISSING_LABEL: Record<string, string> = {
  'Measurement period': 'the year being measured',
  'Annual revenue': 'annual turnover',
  'Entity type': 'type of entity',
  Sector: 'sector',
  'Whether a sector code applies': 'whether a sector code applies',
  'Black ownership percentage': 'black ownership',
  'Whether the entity is a start-up': 'whether it is a start-up',
}

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Company size and sector' }

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
  const warn = applicabilityWarnings(a) as Record<string, string | undefined>
  const result = preview.applicability
  const workflow = workflowForLoaded(loaded, 'applicability')
  const size = describeCompanySize({
    turnover: a.annualRevenue,
    blackOwnershipPercent: a.blackOwnershipPercentage == null ? null : a.blackOwnershipPercentage * 100,
  })
  const prefilled = (assessment as { metadata?: { prefilled_from?: { kind: string; year?: number } | null } | null }).metadata?.prefilled_from
  const pct = (value: number | null) => (value == null ? '' : Number((value * 100).toFixed(6)))
  const workspace = workspaceFor(loaded, workflow, 'applicability')
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const elected = Boolean(a.fullScorecardElection?.elected)
  const small = result.classification === 'eme' || result.classification === 'qse'

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
      workspace={workspace}
    >
      <Flash searchParams={query} />
      <PageHelpData
        page="area-applicability"
        data={{
          missing: result.missingInputs.map((item) => MISSING_LABEL[item] ?? item),
          sectorCode: a.sectorCodeApplies === true,
          smallCompany: a.sectorCodeApplies !== true && small && !elected ? (result.classification === 'eme' ? 'EME' : 'QSE') : null,
          electionIncomplete:
            a.sectorCodeApplies !== true && small && elected && (!a.fullScorecardElection?.reason?.trim() || !a.fullScorecardElection?.evidence?.trim()),
          inputsHref: `${base}/applicability#inputs`,
          next: workspace.next ? { label: workspace.next.label, href: workspace.next.href } : null,
          reviewHref: workspace.reviewHref,
        }}
      />

      <section className="space-y-3 rounded-card border border-line bg-surface p-5 sm:p-6" aria-live="polite" data-help="applicability-summary">
        <p className="text-body font-semibold text-ink">{size.headline}</p>
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
          <p className="text-body text-label">
            {prefilled.kind === 'previous_scorecard'
              ? `Filled in from the company’s ${prefilled.year} scorecard. Check each figure is right for this year.`
              : 'Filled in from the company’s details. Check each figure is right for this year.'}
          </p>
        ) : null}
      </section>

      <section id="inputs" aria-label="Figures">
        <AutoSaveForm action={saveApplicability}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection helpId="applicability-year" title="The year being measured" description="Usually the company’s last financial year." worth={null}>
            <Field
              label="First day"
              name="measurementPeriodStart"
              warning={warn.measurementPeriodStart}
              type="date"
              defaultValue={a.measurementPeriodStart}
              explain={<>The first day of the 12 months being measured (the <Term k="measurementPeriod">measurement period</Term>).</>}
              source="the annual financial statements, which state the financial year"
              example="1 March 2025"
            />
            <Field
              label="Last day"
              name="measurementPeriodEnd"
              warning={warn.measurementPeriodEnd}
              type="date"
              defaultValue={a.measurementPeriodEnd}
              explain="The last day of those 12 months: the financial year end."
              source="the annual financial statements"
              example="28 February 2026"
            />
          </AreaSection>

          <AreaSection helpId="applicability-size" title="Size and ownership" description="These decide which scorecard the company is measured on." worth={null}>
            <Field
              label="Annual turnover (R)"
              name="annualRevenue" warning={warn.annualRevenue}
              type="number"
              step="0.01"
              defaultValue={a.annualRevenue}
              explain={
                <>
                  Total income for the year being measured, before tax. R10 million or less is an <Term k="eme">EME</Term>, under R50
                  million a <Term k="qse">QSE</Term>, R50 million or more is measured on this full scorecard.
                </>
              }
              source="the income statement in the annual financial statements"
              example="30 000 000"
            />
            <Field
              label="Black ownership (%)"
              name="blackOwnershipPercentage" warning={warn.blackOwnershipPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(a.blackOwnershipPercentage)}
              explain="The share of the company owned by black South Africans. For an EME or QSE it sets the automatic level: 51% or more is Level 2, 100% is Level 1."
              // TODO-VERIFY: the share register as the place to find black ownership.
              source="the company’s share register"
              example="51"
            />
            <Field
              label="Black women ownership (%)"
              name="blackWomenOwnershipPercentage" warning={warn.blackWomenOwnershipPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(a.blackWomenOwnershipPercentage)}
              explain="The share owned by black women. It is recorded here; the size test uses black ownership above."
              source="the company’s share register"
              example="30"
            />
            <SelectField
              label="Is it a start-up?"
              name="isStartUp" warning={warn.isStartUp}
              defaultValue={yesNo(a.isStartUp)}
              hint={
                <>
                  {/* TODO-VERIFY: "a company in its first year" as the definition of a start-up. */}
                  A company in its first year. Answer Yes and it is treated as an <Term k="eme">EME</Term>, whatever its turnover.
                  Find it in the registration date on the company’s CIPC certificate. For example: No, for a company trading since
                  2015.
                </>
              }
              options={[
                { value: '', label: 'Not answered' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </AreaSection>

          <AreaSection helpId="applicability-sector" title="Sector" description="Some industries are measured on their own sector code instead of the Generic codes." worth={null}>
            <Field
              label="Sector"
              name="sector"
              warning={warn.sector}
              defaultValue={a.sector}
              explain="The industry the company works in."
              source="the description of the business in the annual financial statements"
              example="Manufacturing"
            />
            <SelectField
              label="Does a sector code apply to the company?"
              name="sectorCodeApplies" warning={warn.sectorCodeApplies}
              defaultValue={yesNo(a.sectorCodeApplies)}
              hint={
                <>
                  Yes only if the company’s industry has its own sector code, such as the ICT Sector Code. Then this scorecard cannot give
                  its level. If you are not sure, ask your <Term k="verification">verification agency</Term>. For example: No, for a
                  general manufacturer.
                </>
              }
              options={[
                { value: '', label: 'Not answered' },
                { value: 'no', label: 'No, the Generic codes apply' },
                { value: 'yes', label: 'Yes, a sector code applies' },
              ]}
            />
            <Field
              label="Which sector code"
              name="sectorCodeName"
              warning={warn.sectorCodeName}
              defaultValue={a.sectorCodeName}
              explain="Only when a sector code applies: its name."
              // TODO-VERIFY: that a B-BBEE certificate names the sector code the company was measured on.
              source="the company’s last B-BBEE certificate, which names the code it was measured on"
              example="ICT Sector Code"
            />
            <Field
              label="Type of entity"
              name="entityType"
              warning={warn.entityType}
              defaultValue={a.entityType}
              explain="Its legal form."
              source="the company’s CIPC registration certificate"
              example="Private company"
            />
          </AreaSection>

          <div data-help="applicability-election">
          <MoreOptions label="More options: an EME or QSE choosing the full scorecard">
            <p className="text-body text-label">
              An <Term k="eme">EME</Term> or <Term k="qse">QSE</Term> may choose to be measured on the full Generic scorecard instead
              of its automatic level. Record why, and the evidence; without both the choice is not accepted.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Choose the full scorecard?"
                name="fullScorecardElection" warning={warn.fullScorecardElection}
                defaultValue={a.fullScorecardElection?.elected ? 'yes' : ''}
                hint="Yes only for an EME or QSE that chooses the full scorecard; its automatic level then no longer applies. For example: Yes, when a client asks for a full scorecard."
                options={[
                  { value: '', label: 'No' },
                  { value: 'yes', label: 'Yes' },
                ]}
              />
              <Field
                label="Why"
                name="electionReason"
                warning={warn.electionReason}
                defaultValue={a.fullScorecardElection?.reason}
                explain="Why the company chose the full scorecard. Needed for the choice to count."
                source="the board or management decision to use the full scorecard"
                example="A client tender asks for a full scorecard"
              />
              <Field
                label="Evidence"
                name="electionEvidence"
                warning={warn.electionEvidence}
                defaultValue={a.fullScorecardElection?.evidence}
                explain="What records the choice. Needed for the choice to count."
                source="the company’s records"
                // TODO-VERIFY: a board resolution as acceptable evidence of the election.
                example="Board resolution signed 12 March 2026"
              />
            </div>
          </MoreOptions>
          </div>
        </AutoSaveForm>
      </section>
    </Shell>
  )
}
