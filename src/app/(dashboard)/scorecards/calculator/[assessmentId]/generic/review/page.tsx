import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GENERIC_CODES_USER_LABEL } from '@/lib/scorecard/generic/ux/workflow'
import { calculateGenericScorecardRun } from '../actions'
import { loadGenericAssessment } from '../load'
import { AssessmentAside, Card, Flash, Shell, formatPoints } from '../ui'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { storedCalculation, workflowForLoaded } from '../workflow-context'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview } = loaded
  const workflow = workflowForLoaded(loaded, 'review')

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="review"
      title="Review and calculate"
      subtitle="Changing inputs does not update a saved calculation automatically. Calculate the scorecard when you are ready to store a new result."
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

      <Card title="Readiness checklist">
        {preview.readiness.complete ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Required inputs look complete. You can calculate the scorecard to produce a final B-BBEE level.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Complete the remaining items below before calculating the scorecard. A final level is not available
              until calculation succeeds with all required information.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {preview.readiness.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex justify-between gap-3">
            <span>Workbook uploaded</span>
            <span className="font-medium">{workflow.checklist.workbookUploaded ? 'Yes' : 'No'}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Elements reviewed</span>
            <span className="font-medium">{workflow.checklist.elementsReviewed ? 'Yes' : 'No'}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Procurement attached</span>
            <span className="font-medium">{workflow.checklist.procurementAttached ? 'Yes' : 'No'}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Ready to calculate</span>
            <span className="font-medium">{workflow.checklist.readyToCalculate ? 'Yes' : 'Not yet'}</span>
          </li>
        </ul>
      </Card>

      <Card title="Element summary">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Element</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Base</th>
                <th className="px-3 py-2">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {preview.elements.map((element) => (
                <tr key={element.elementKey} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{element.displayName}</td>
                  <td className="px-3 py-2 capitalize text-slate-600">{element.status.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">
                    {formatPoints(element.basePointsAchieved)} / {formatPoints(element.basePointsAvailable)}
                  </td>
                  <td className="px-3 py-2">
                    {formatPoints(element.bonusPointsAchieved)} / {formatPoints(element.bonusPointsAvailable)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Priority sub-minimums">
        <ul className="space-y-2">
          {preview.prioritySubminimums.map((outcome) => (
            <li
              key={outcome.key}
              className={`rounded-xl px-3 py-2 text-sm ${
                outcome.passed === false
                  ? 'bg-rose-50 text-rose-950'
                  : outcome.passed === true
                    ? 'bg-emerald-50 text-emerald-950'
                    : 'bg-slate-50 text-slate-700'
              }`}
            >
              <p className="font-semibold">{outcome.label}</p>
              <p className="mt-1 text-xs">{outcome.explanation}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Calculate scorecard">
        <p className="text-sm text-slate-700">
          Rule set: {GENERIC_CODES_USER_LABEL}
        </p>
        <details className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-800">Calculation details</summary>
          <p className="mt-2 text-xs text-slate-500">
            Internal rule key: {preview.ruleSetKey} · version {preview.ruleSetVersion}
          </p>
        </details>
        <form action={calculateGenericScorecardRun} className="pt-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <PendingSubmitButton
            label="Calculate scorecard"
            pendingLabel="Calculating scorecard…"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0a5257] disabled:cursor-wait disabled:opacity-80"
          />
        </form>
        <Link
          href={`/scorecards/calculator/${assessmentId}/generic/result`}
          className="inline-flex text-sm font-semibold text-[#063b3f] hover:underline"
        >
          Open saved calculation →
        </Link>
      </Card>
    </Shell>
  )
}
