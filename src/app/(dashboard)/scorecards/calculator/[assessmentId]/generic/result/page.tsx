import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PARTIAL_RESULT_MESSAGE, type GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { loadGenericAssessment } from '../load'
import { Card, Flash, IndicatorTable, Shell, formatPoints } from '../ui'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ResultPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview } = loaded
  const stored = assessment.overall_result_snapshot as GenericScorecardCalculation | null
  const result = stored ?? preview
  const usingStored = Boolean(stored) && !assessment.needs_recalculation

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="result"
      title="Final result"
      subtitle="Stored calculation runs preserve the rule set, input snapshot, formula breakdown, priority outcomes and levels. Changing any input marks the assessment as needing an explicit recalculation."
    >
      <Flash searchParams={query} />

      {!usingStored ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Showing a live preview. Run an explicit calculation from Review to store a historical result.
        </p>
      ) : null}

      <Card title="Scorecard outcome">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Base points</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatPoints(result.totalBasePointsAchieved)}
            </p>
            <p className="text-xs text-slate-500">of {formatPoints(result.totalBasePointsAvailable)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Bonus points</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatPoints(result.totalBonusPointsAchieved)}
            </p>
            <p className="text-xs text-slate-500">of {formatPoints(result.totalBonusPointsAvailable)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Raw total</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatPoints(result.rawTotalPoints)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Recognition</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {result.readiness.complete ? `${result.finalLevel.recognitionPercentage}%` : '—'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Preliminary level</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{result.preliminaryLevel.level}</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Final level</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {result.readiness.complete ? result.finalLevel.level : PARTIAL_RESULT_MESSAGE}
            </p>
            {result.discountApplied ? (
              <p className="mt-1 text-xs text-amber-800">
                Discounted by one level. Failed: {result.failedPriorityKeys.join(', ')}
              </p>
            ) : null}
          </div>
        </div>

        <p className="text-sm text-slate-600">{result.headlineMessage}</p>
        <p className="text-xs text-slate-500">
          Rule set {result.ruleSetKey} v{result.ruleSetVersion} · {result.ruleSetDisplayName}
        </p>
      </Card>

      <Card title="Priority-element outcomes">
        <ul className="space-y-2">
          {result.prioritySubminimums.map((outcome) => (
            <li key={outcome.key} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
              <span className="font-semibold">{outcome.label}: </span>
              {outcome.explanation}
            </li>
          ))}
        </ul>
      </Card>

      {result.warnings.length > 0 ? (
        <Card title="Unresolved warnings">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {result.elements.map((element) => (
        <Card key={element.elementKey} title={element.displayName}>
          <IndicatorTable element={element} />
        </Card>
      ))}

      <Card title="Reporting">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/scorecards/calculator/${assessmentId}/report`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Open printable report
          </Link>
          <Link
            href={`/scorecards/calculator/${assessmentId}/generic/review`}
            className="rounded-xl bg-[#063b3f] px-4 py-2 text-sm font-semibold text-white"
          >
            Recalculate
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          This product is an internal scorecard calculator and readiness tool. It does not issue a legally
          verified B-BBEE certificate. Final results remain subject to evidence review and authorised verification.
        </p>
      </Card>
    </Shell>
  )
}
