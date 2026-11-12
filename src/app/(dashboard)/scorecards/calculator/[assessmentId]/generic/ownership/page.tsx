import { notFound } from 'next/navigation'
import { saveOwnership } from '../actions'
import { loadGenericAssessment } from '../load'
import { Field, Flash, IndicatorTable, SelectField, Shell } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaIntro, AreaSection, sectionWorth } from '../workspace'
import { sameAsWorkbook, workbookReading, workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Card'
import { Term } from '@/components/ui/Term'
import { PageHelpData } from '@/components/help/PageHelpData'
import { ownershipWarnings } from '@/lib/scorecard/generic/ux/sanity'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { areaHelpData, figureGap } from '../area-help-a'

/** Page help: each ownership line in the words the fields use. */
const OWNERSHIP_GAP_NAMES: Record<string, string> = {
  'ownership.voting_rights.black_people': 'black voting rights',
  'ownership.voting_rights.black_women': 'black women voting rights',
  'ownership.economic_interest.black_people': 'black economic interest',
  'ownership.economic_interest.black_women': 'black women economic interest',
  'ownership.economic_interest.designated_groups': 'designated groups',
  'ownership.new_entrants': 'black new entrants',
  'ownership.net_value': 'net value',
}

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Ownership' }

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
  const workspace = workspaceFor(loaded, workflow, 'ownership')
  const hereHref = `/scorecards/calculator/${assessmentId}/generic/ownership#inputs`
  // Page help: what is still empty, from the engine's unscored lines and the two
  // declared extras (the same things that keep Ownership "In progress").
  const helpData = areaHelpData({
    areaKey: 'ownership',
    preview,
    workspace,
    hereHref,
    gaps: [
      ...(element?.indicators ?? [])
        .filter((indicator) => indicator.status !== 'scored')
        .map((indicator) => figureGap(OWNERSHIP_GAP_NAMES[indicator.indicatorKey] ?? indicator.displayName.toLowerCase(), hereHref)),
      ...(o.measurementDate?.trim() ? [] : [figureGap('the measurement date', hereHref)]),
      ...(o.evidenceSource?.trim() ? [] : [figureGap('where the figures come from', hereHref)]),
    ],
  })

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
      workspace={workspace}
    >
      <PageHelpData page="area-ownership" data={helpData} />
      <Flash searchParams={query} />
      <AreaIntro areaKey="ownership" preview={preview} company={company.name} />

      <section id="inputs" aria-label="Figures">
        <AutoSaveForm action={saveOwnership}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection
            helpId="ownership-voting"
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
              explain="The share of all shareholder votes held by black people. Target: 25% plus one vote."
              source="the share register and the shareholders’ agreement"
              example="30"
              fromWorkbook={fromWorkbook('blackVotingRightsPercentage')}
            />
            <Field
              label="Black women voting rights (%)"
              name="blackWomenVotingRightsPercentage" warning={warn.blackWomenVotingRightsPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.blackWomenVotingRightsPercentage)}
              explain="The share of all shareholder votes held by black women. Target: 10%."
              source="the share register and the shareholders’ agreement"
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
              explain="The share of profits black shareholders are entitled to. Target: 25%."
              source="the share register and the shareholders’ agreement"
              example="30"
              fromWorkbook={fromWorkbook('blackEconomicInterestPercentage')}
            />
            <Field
              label="Black women economic interest (%)"
              name="blackWomenEconomicInterestPercentage" warning={warn.blackWomenEconomicInterestPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.blackWomenEconomicInterestPercentage)}
              explain="The share of profits black women shareholders are entitled to. Target: 10%."
              source="the share register and the shareholders’ agreement"
              example="10"
              fromWorkbook={fromWorkbook('blackWomenEconomicInterestPercentage')}
            />
            <Field
              label="Designated groups (%)"
              name="designatedGroupsEconomicInterestPercentage" warning={warn.designatedGroupsEconomicInterestPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.designatedGroupsEconomicInterestPercentage)}
              explain="Profit share held by black designated groups, employee share schemes or broad-based schemes. Target: 3%."
              // TODO-VERIFY: where to find designated-group / scheme holdings.
              source="the trust deed or scheme rules, with the share register"
              example="2"
              fromWorkbook={fromWorkbook('designatedGroupsEconomicInterestPercentage')}
            />
            <Field
              label="Black new entrants (%)"
              name="newEntrantsEconomicInterestPercentage" warning={warn.newEntrantsEconomicInterestPercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.newEntrantsEconomicInterestPercentage)}
              explain="Profit share held by black people taking part in their first significant ownership deals. Target: 2%."
              // TODO-VERIFY: where to find black new entrant holdings.
              source="the shareholders’ declarations or your verification agency’s ownership analysis"
              example="1.3"
              fromWorkbook={fromWorkbook('newEntrantsEconomicInterestPercentage')}
            />
          </AreaSection>

          <AreaSection
            helpId="ownership-net-value"
            title="Net value and evidence"
            description="How much of the black shareholders’ stake is truly theirs, after any debt used to buy it."
            worth={sectionWorth(element, ['ownership.net_value'])}
          >
            <Field
              label={
                <>
                  <Term k="netValue">Net value</Term> (%)
                </>
              }
              name="netValuePercentage" warning={warn.netValuePercentage}
              type="number"
              step="0.01"
              defaultValue={pct(o.netValuePercentage)}
              explain="The black shareholders’ net value as a percentage. The app does not work it out; it scores the figure against a 25% target. Below 10% misses the priority minimum."
              source="your verification agency’s net value calculation"
              example="15"
              fromWorkbook={fromWorkbook('netValuePercentage')}
            />
            <Field
              label="Measurement date"
              name="measurementDate" warning={warn.measurementDate}
              type="date"
              defaultValue={o.measurementDate}
              // TODO-VERIFY: "usually the financial year end" (existing copy).
              explain="The date these ownership figures apply to, usually the financial year end. Needed before the level can be final."
              source="the annual financial statements"
              example="28 Feb 2026"
            />
            <div className="sm:col-span-2">
              <Field
                label="Where the figures come from"
                name="evidenceSource" warning={warn.evidenceSource}
                defaultValue={o.evidenceSource}
                explain="Name the documents behind these figures. It does not change the points, but it is needed before the level can be final."
                example="Share register at 28 Feb 2026 and the verification agency’s ownership report"
                fromWorkbook={fromWorkbook('evidenceSource')}
              />
            </div>
          </AreaSection>

          <MoreOptions label="More options: exact votes and notes">
            <p className="text-body text-label">
              Exact vote counts are more precise than a percentage. With the total filled in, a line&apos;s vote count is used
              for that line instead of its voting percentage above.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Total votes"
                name="totalExercisableVotes"
                warning={warn.totalExercisableVotes}
                type="number"
                step="1"
                defaultValue={o.totalExercisableVotes}
                explain="Every vote that can be cast at a shareholders’ meeting."
                source="the share register and the shareholders’ agreement"
                example="1000"
              />
              <Field
                label="Votes held by black people"
                name="blackExercisableVotes"
                warning={warn.blackExercisableVotes}
                type="number"
                step="1"
                defaultValue={o.blackExercisableVotes}
                explain="Votes black shareholders can cast. Used instead of the black voting rights percentage."
                source="the share register and the shareholders’ agreement"
                example="300"
              />
              <Field
                label="Votes held by black women"
                name="blackWomenExercisableVotes"
                warning={warn.blackWomenExercisableVotes}
                type="number"
                step="1"
                defaultValue={o.blackWomenExercisableVotes}
                explain="Votes black women shareholders can cast. Used instead of the black women voting rights percentage."
                source="the share register and the shareholders’ agreement"
                example="120"
              />
              <SelectField
                label="Modified flow-through applied?"
                name="modifiedFlowThroughApplied" warning={warn.modifiedFlowThroughApplied}
                defaultValue={yesNo(o.modifiedFlowThroughApplied)}
                options={YES_NO}
                hint="Only when your verification agency applied it. It does not change the points here. Find it in the agency’s ownership analysis."
              />
              <SelectField
                label="Exclusion principle applied?"
                name="exclusionPrincipleApplied" warning={warn.exclusionPrincipleApplied}
                defaultValue={yesNo(o.exclusionPrincipleApplied)}
                options={YES_NO}
                hint="Only when your verification agency applied it. It does not change the points here. Find it in the agency’s ownership analysis."
              />
              <div className="sm:col-span-2">
                <Field
                  label="Notes"
                  name="practitionerNotes"
                  warning={warn.practitionerNotes}
                  defaultValue={o.practitionerNotes}
                  explain="Anything a reviewer should know about these figures."
                  example="Votes from the share register at 28 Feb 2026; net value from the agency’s draft report"
                />
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
