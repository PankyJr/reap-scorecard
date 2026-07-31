import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PARTIAL_RESULT_MESSAGE } from '@/lib/scorecard/generic'
import { calculateGenericScorecardRun } from '../actions'
import { loadGenericAssessment } from '../load'
import { Card, Flash, ResultSummary, Shell, formatPoints } from '../ui'

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

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="review"
      title="Review and calculate"
      subtitle="Changing inputs never silently mutates a historical result. Run an explicit calculation to store a new calculation run, priority outcomes and the overall result snapshot."
      aside={<ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />}
    >
      <Flash searchParams={query} />

      <Card title="Readiness">
        {preview.readiness.complete ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            All required inputs appear complete. An explicit calculation may produce a final B-BBEE level.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">{PARTIAL_RESULT_MESSAGE}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {preview.readiness.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
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

      <Card title="Explicit calculation">
        <p className="text-sm text-slate-600">
          Rule set: {preview.ruleSetKey} v{preview.ruleSetVersion}. Preliminary level:{' '}
          {preview.preliminaryLevel.level}
          {preview.discountApplied ? ` → discounted to ${preview.finalLevel.level}` : ''}.
        </p>
        <form action={calculateGenericScorecardRun} className="pt-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <button
            type="submit"
            className="rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0a5257]"
          >
            Calculate and store result
          </button>
        </form>
        <Link
          href={`/scorecards/calculator/${assessmentId}/generic/result`}
          className="inline-flex text-sm font-semibold text-[#063b3f] hover:underline"
        >
          Open stored result →
        </Link>
      </Card>
    </Shell>
  )
}
