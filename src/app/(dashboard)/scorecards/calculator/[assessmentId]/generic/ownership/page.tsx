import { notFound } from 'next/navigation'
import { saveOwnership } from '../actions'
import { loadGenericAssessment } from '../load'
import { Card, Field, Flash, IndicatorTable, ResultSummary, SelectField, Shell, FormCard} from '../ui'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OwnershipPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, inputs } = loaded
  const o = inputs.ownership
  const element = preview.elements.find((candidate) => candidate.elementKey === 'ownership')
  const pct = (value: number | null) => (value == null ? '' : value * 100)

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="ownership"
      title="Ownership — 25 points"
      subtitle='Exact exercisable vote counts are preferred for the "25% plus one vote" target. Net value must be supplied as a verified result — this release does not model the ownership transaction.'
      aside={<ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />}
    >
      <Flash searchParams={query} />

      {element ? (
        <Card title="Current score">
          <IndicatorTable element={element} />
        </Card>
      ) : null}

      <FormCard title="Capture ownership inputs" action={saveOwnership}>
          <div className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="assessmentId" value={assessmentId} />
          <Field label="Total exercisable votes" name="totalExercisableVotes" type="number" step="1" defaultValue={o.totalExercisableVotes} />
          <Field label="Black exercisable votes" name="blackExercisableVotes" type="number" step="1" defaultValue={o.blackExercisableVotes} />
          <Field label="Black women exercisable votes" name="blackWomenExercisableVotes" type="number" step="1" defaultValue={o.blackWomenExercisableVotes} />
          <Field label="Black voting rights % (fallback)" name="blackVotingRightsPercentage" type="number" step="0.01" defaultValue={pct(o.blackVotingRightsPercentage)} hint="Only used when vote counts are absent. Approximates 25% + 1 vote as 25.1%." />
          <Field label="Black women voting rights %" name="blackWomenVotingRightsPercentage" type="number" step="0.01" defaultValue={pct(o.blackWomenVotingRightsPercentage)} />
          <Field label="Black economic interest %" name="blackEconomicInterestPercentage" type="number" step="0.01" defaultValue={pct(o.blackEconomicInterestPercentage)} />
          <Field label="Black women economic interest %" name="blackWomenEconomicInterestPercentage" type="number" step="0.01" defaultValue={pct(o.blackWomenEconomicInterestPercentage)} />
          <Field label="Designated groups / ESOP / BBOS %" name="designatedGroupsEconomicInterestPercentage" type="number" step="0.01" defaultValue={pct(o.designatedGroupsEconomicInterestPercentage)} />
          <Field label="Black new entrants %" name="newEntrantsEconomicInterestPercentage" type="number" step="0.01" defaultValue={pct(o.newEntrantsEconomicInterestPercentage)} />
          <Field label="Net value % (verified)" name="netValuePercentage" type="number" step="0.01" defaultValue={pct(o.netValuePercentage)} hint="Priority sub-minimum: 40% of 8 Net Value points." />
          <Field label="Evidence source" name="evidenceSource" defaultValue={o.evidenceSource} />
          <Field label="Measurement date" name="measurementDate" type="date" defaultValue={o.measurementDate} />
          <SelectField
            label="Modified flow-through applied?"
            name="modifiedFlowThroughApplied"
            defaultValue={o.modifiedFlowThroughApplied == null ? '' : o.modifiedFlowThroughApplied ? 'yes' : 'no'}
            options={[
              { value: '', label: 'Not captured' },
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
          />
          <SelectField
            label="Exclusion principle applied?"
            name="exclusionPrincipleApplied"
            defaultValue={o.exclusionPrincipleApplied == null ? '' : o.exclusionPrincipleApplied ? 'yes' : 'no'}
            options={[
              { value: '', label: 'Not captured' },
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
          />
          <div className="sm:col-span-2">
            <Field label="Practitioner notes" name="practitionerNotes" defaultValue={o.practitionerNotes} />
          </div>
          </div>
        </FormCard>
    </Shell>
  )
}
