import { notFound } from 'next/navigation'
import { saveOwnership } from '../actions'
import { loadGenericAssessment } from '../load'
import { Field, Flash, IndicatorTable, SelectField, Shell } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaIntro, AreaSection, sectionWorth } from '../workspace'
import { sameAsWorkbook, workbookReading, workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Panel'
import { ownershipWarnings } from '@/lib/scorecard/generic/ux/sanity'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const yesNo = (value: boolean | null) => (value == null ? '' : value ? 'yes' : 'no')
const YES_NO = [
  { value: '', label: 'Not answered' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export default async function OwnershipPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, inputs } = loaded
  const o = inputs.ownership
  const warn = ownershipWarnings(o)
  const element = preview.elements.find((candidate) => candidate.elementKey === 'ownership')
  const pct = (value: number | null) => (value == null ? '' : Number((value * 100).toFixed(6)))
  const workflow = workflowForLoaded(loaded, 'ownership')
  const reading = workbookReading(loaded)?.ownership as Record<string, unknown> | undefined
  const fromWorkbook = (field: keyof typeof o) => sameAsWorkbook(reading?.[field], o[field])

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="ownership"
      title="Ownership"
      subtitle={AREA_COPY.ownership.measures}
      workflow={workflow}
      workspace={workspaceFor(loaded, workflow, 'ownership')}
    >
      <Flash searchParams={query} />
      <AreaIntro areaKey="ownership" preview={preview} />

      <section id="inputs" className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <AutoSaveForm action={saveOwnership}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection
            title="Voting rights"
            description="Who gets a say: the share of shareholder votes."
            worth={sectionWorth(element, ['ownership.voting_rights'])}
          >
            <Field
              label="Black voting rights (%)"
              name="blackVotingRightsPercentage" warning={warn.blackVotingRightsPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.blackVotingRightsPercentage)}
              explain="The share of all shareholder votes held by black people."
              example="30"
              fromWorkbook={fromWorkbook('blackVotingRightsPercentage')}
            />
            <Field
              label="Black women voting rights (%)"
              name="blackWomenVotingRightsPercentage" warning={warn.blackWomenVotingRightsPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.blackWomenVotingRightsPercentage)}
              explain="The share of all shareholder votes held by black women."
              example="12"
              fromWorkbook={fromWorkbook('blackWomenVotingRightsPercentage')}
            />
          </AreaSection>

          <AreaSection
            title="Economic interest"
            description="Who gets the money: the share of profits and dividends."
            worth={sectionWorth(element, ['ownership.economic_interest', 'ownership.new_entrants'])}
          >
            <Field
              label="Black economic interest (%)"
              name="blackEconomicInterestPercentage" warning={warn.blackEconomicInterestPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.blackEconomicInterestPercentage)}
              explain="The share of profits black shareholders are entitled to."
              example="30"
              fromWorkbook={fromWorkbook('blackEconomicInterestPercentage')}
            />
            <Field
              label="Black women economic interest (%)"
              name="blackWomenEconomicInterestPercentage" warning={warn.blackWomenEconomicInterestPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.blackWomenEconomicInterestPercentage)}
              explain="The share of profits black women shareholders are entitled to."
              example="10"
              fromWorkbook={fromWorkbook('blackWomenEconomicInterestPercentage')}
            />
            <Field
              label="Designated groups (%)"
              name="designatedGroupsEconomicInterestPercentage" warning={warn.designatedGroupsEconomicInterestPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.designatedGroupsEconomicInterestPercentage)}
              explain="Profit share held by black designated groups, employee share schemes or broad-based schemes."
              example="2"
              fromWorkbook={fromWorkbook('designatedGroupsEconomicInterestPercentage')}
            />
            <Field
              label="Black new entrants (%)"
              name="newEntrantsEconomicInterestPercentage" warning={warn.newEntrantsEconomicInterestPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.newEntrantsEconomicInterestPercentage)}
              explain="Profit share held by black people taking part in their first significant ownership deals."
              example="1.3"
              fromWorkbook={fromWorkbook('newEntrantsEconomicInterestPercentage')}
            />
          </AreaSection>

          <AreaSection
            title="Net value and evidence"
            description="How much of the black shareholders’ stake is truly theirs, after any debt used to buy it."
            worth={sectionWorth(element, ['ownership.net_value'])}
          >
            <Field
              label="Net value (%)"
              name="netValuePercentage" warning={warn.netValuePercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.netValuePercentage)}
              explain="Enter the verified figure."
              example="15"
              fromWorkbook={fromWorkbook('netValuePercentage')}
            />
            <Field
              label="Measurement date"
              name="measurementDate" warning={warn.measurementDate}
              type="date"
              defaultValue={o.measurementDate}
              explain="The date these ownership figures apply to, usually the financial year end."
            />
            <div className="sm:col-span-2">
              <Field
                label="Where the figures come from"
                name="evidenceSource" warning={warn.evidenceSource}
                defaultValue={o.evidenceSource}
                explain="Needed for full points: for example the share register or the verification report."
                fromWorkbook={fromWorkbook('evidenceSource')}
              />
            </div>
          </AreaSection>

          <MoreOptions label="More options: exact votes and notes">
            <p className="text-[15px] text-muted">
              Exact vote counts are more precise than a percentage. With the total filled in, a line&apos;s vote count is used
              for that line instead of its voting percentage above.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total votes" name="totalExercisableVotes" warning={warn.totalExercisableVotes} type="number" step="1" defaultValue={o.totalExercisableVotes} example="1000" />
              <Field label="Votes held by black people" name="blackExercisableVotes" warning={warn.blackExercisableVotes} type="number" step="1" defaultValue={o.blackExercisableVotes} example="300" />
              <Field label="Votes held by black women" name="blackWomenExercisableVotes" warning={warn.blackWomenExercisableVotes} type="number" step="1" defaultValue={o.blackWomenExercisableVotes} example="120" />
              <SelectField
                label="Modified flow-through applied?"
                name="modifiedFlowThroughApplied" warning={warn.modifiedFlowThroughApplied}
                defaultValue={yesNo(o.modifiedFlowThroughApplied)}
                options={YES_NO}
                hint="Only when your verification agency applied it."
              />
              <SelectField
                label="Exclusion principle applied?"
                name="exclusionPrincipleApplied" warning={warn.exclusionPrincipleApplied}
                defaultValue={yesNo(o.exclusionPrincipleApplied)}
                options={YES_NO}
                hint="Only when your verification agency applied it."
              />
              <div className="sm:col-span-2">
                <Field label="Notes" name="practitionerNotes" warning={warn.practitionerNotes} defaultValue={o.practitionerNotes} explain="Anything a reviewer should know about these figures." />
              </div>
            </div>
          </MoreOptions>
        </AutoSaveForm>
      </section>

      {element ? (
        <MoreOptions label={`How the points are worked out (${element.indicators.length} lines)`}>
          <IndicatorTable element={element} />
        </MoreOptions>
      ) : null}
    </Shell>
  )
}
