import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { finalLevelDisplay, GENERIC_CODES_USER_LABEL } from '@/lib/scorecard/generic/ux/workflow'
import { loadGenericAssessment } from '../load'
import { AssessmentAside, Card, Flash, IndicatorTable, Shell, formatPoints } from '../ui'
import { storedCalculation, workflowForLoaded } from '../workflow-context'

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
  const workflow = workflowForLoaded(loaded, 'result')
  const level = finalLevelDisplay({
    hasStoredCalculation: Boolean(stored),
    needsRecalculation: Boolean(assessment.needs_recalculation),
    readinessComplete: result.readiness.complete,
    level: result.finalLevel.level,
  })

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="result"
      title="Final result"
      subtitle="Saved calculations keep the rule set, inputs, formula breakdown, priority outcomes and levels. Changing inputs means you need to calculate the scorecard again."
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

      {!usingStored ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Showing working values. Open Review and calculate the scorecard to store a saved calculation.
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
              {usingStored && result.readiness.complete ? `${result.finalLevel.recognitionPercentage}%` : '—'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Preliminary level</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {usingStored ? result.preliminaryLevel.level : 'Not available'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Final level</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{level.value}</p>
            {level.supportingMessage ? (
              <p className="mt-1 text-xs text-slate-600">{level.supportingMessage}</p>
            ) : null}
            {usingStored && result.discountApplied ? (
              <p className="mt-1 text-xs text-amber-800">
                Discounted by one level. Failed: {result.failedPriorityKeys.join(', ')}
              </p>
            ) : null}
          </div>
        </div>

        <p className="text-sm text-slate-600">{usingStored ? result.headlineMessage : 'Saved calculation not available yet.'}</p>
        <p className="text-sm text-slate-700">Rule set: {GENERIC_CODES_USER_LABEL}</p>
        <details className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-800">Calculation details</summary>
          <p className="mt-2 text-xs text-slate-500">
            Internal rule key: {result.ruleSetKey} · version {result.ruleSetVersion}
            {result.ruleSetDisplayName ? ` · ${result.ruleSetDisplayName}` : ''}
          </p>
        </details>
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
            Calculate scorecard
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
