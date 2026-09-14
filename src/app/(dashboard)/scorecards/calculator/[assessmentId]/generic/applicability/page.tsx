import { notFound } from 'next/navigation'
import { saveApplicability } from '../actions'
import { loadGenericAssessment } from '../load'
import { AssessmentAside, Card, Field, Flash, FormCard, SelectField, Shell } from '../ui'
import { storedCalculation, workflowForLoaded } from '../workflow-context'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ApplicabilityPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, inputs } = loaded
  const a = inputs.applicability
  const result = preview.applicability
  const workflow = workflowForLoaded(loaded, 'applicability')

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="applicability"
      title="Applicability gate"
      subtitle="A final generic-code B-BBEE level is only produced for a Generic / Large Enterprise under the Generic Codes. Sector codes, EME and QSE deemed status, and start-up treatment are evaluated before any level is published."
      workflow={workflow}
      aside={
        <AssessmentAside
          preview={preview}
          workflow={workflow}
          stored={storedCalculation(loaded)}
        />
      }
    >
      <Flash searchParams={query} />

      <Card title="Current classification">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-slate-500">Classification</dt>
            <dd className="font-semibold uppercase text-slate-950">{result.classification}</dd>
          </div>
          <div>
            <dt className="text-slate-500">May produce final level</dt>
            <dd className="font-semibold text-slate-950">{result.mayProduceGenericFinalLevel ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
        <p className="text-sm text-slate-600">{result.classificationReason}</p>
        {result.deemedStatus ? (
          <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-950">
            Deemed status: {result.deemedStatus.level} ({result.deemedStatus.recognitionPercentage}% recognition).{' '}
            {result.deemedStatus.reason}
          </p>
        ) : null}
        {result.blockingReasons.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
            {result.blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </Card>

      <FormCard title="Capture applicability" action={saveApplicability}>
        <div className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <Field label="Measurement period start" name="measurementPeriodStart" type="date" defaultValue={a.measurementPeriodStart} />
          <Field label="Measurement period end" name="measurementPeriodEnd" type="date" defaultValue={a.measurementPeriodEnd} />
          <Field label="Annual revenue (R)" name="annualRevenue" type="number" step="0.01" defaultValue={a.annualRevenue} hint="EME ≤ R10m · QSE ≤ R50m · Generic above R50m" />
          <Field label="Entity type" name="entityType" defaultValue={a.entityType} />
          <Field label="Sector" name="sector" defaultValue={a.sector} />
          <SelectField
            label="Does a sector code apply?"
            name="sectorCodeApplies"
            defaultValue={a.sectorCodeApplies == null ? '' : a.sectorCodeApplies ? 'yes' : 'no'}
            options={[
              { value: '', label: 'Not captured' },
              { value: 'yes', label: 'Yes — sector code applies' },
              { value: 'no', label: 'No — Generic Codes apply' },
            ]}
          />
          <Field label="Sector code name" name="sectorCodeName" defaultValue={a.sectorCodeName} hint="Required when a sector code applies" />
          <Field
            label="Black ownership %"
            name="blackOwnershipPercentage"
            type="number"
            step="0.01"
            defaultValue={a.blackOwnershipPercentage == null ? '' : a.blackOwnershipPercentage * 100}
            hint="Enter 51 for 51%"
          />
          <Field
            label="Black women ownership %"
            name="blackWomenOwnershipPercentage"
            type="number"
            step="0.01"
            defaultValue={a.blackWomenOwnershipPercentage == null ? '' : a.blackWomenOwnershipPercentage * 100}
          />
          <SelectField
            label="Is the entity a start-up?"
            name="isStartUp"
            defaultValue={a.isStartUp == null ? '' : a.isStartUp ? 'yes' : 'no'}
            options={[
              { value: '', label: 'Not captured' },
              { value: 'yes', label: 'Yes — treat as EME' },
              { value: 'no', label: 'No' },
            ]}
          />
          <SelectField
            label="Elect full generic scorecard (EME/QSE only)"
            name="fullScorecardElection"
            defaultValue={a.fullScorecardElection?.elected ? 'yes' : ''}
            options={[
              { value: '', label: 'No election' },
              { value: 'yes', label: 'Yes — elect full scorecard' },
            ]}
            hint="Record a reason and evidence. An election without a reason is rejected."
          />
          <Field label="Election reason" name="electionReason" defaultValue={a.fullScorecardElection?.reason} />
          <Field label="Election evidence" name="electionEvidence" defaultValue={a.fullScorecardElection?.evidence} />
        </div>
      </FormCard>
    </Shell>
  )
}
