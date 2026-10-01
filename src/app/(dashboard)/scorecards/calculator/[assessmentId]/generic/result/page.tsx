import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText } from 'lucide-react'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { finalLevelDisplay, GENERIC_CODES_USER_LABEL } from '@/lib/scorecard/generic/ux/workflow'
import { loadGenericAssessment } from '../load'
import { Flash, IndicatorTable, Shell, formatElementPoints, formatPoints } from '../ui'
import { workflowForLoaded } from '../workflow-context'
import { Panel, MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { LevelLadder } from '@/components/ui/LevelLadder'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'

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
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const level = finalLevelDisplay({
    hasStoredCalculation: Boolean(stored),
    needsRecalculation: Boolean(assessment.needs_recalculation),
    readinessComplete: result.readiness.complete,
    level: result.finalLevel.level,
  })
  const isFinal = level.value !== 'Not available'
  const failed = result.prioritySubminimums.filter((p) => p.evaluated && !p.passed)

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="result"
      title="Result"
      subtitle="The saved calculation: the level, the points for each element, and anything that held the level back."
      workflow={workflow}
    >
      <Flash searchParams={query} />

      {!stored ? (
        <Notice
          tone="warn"
          title="Not calculated yet"
          action={
            <Link href={`${base}/review`} className={buttonStyles({ variant: 'primary' })}>
              Go to calculate
            </Link>
          }
        >
          These are working figures only. Calculate to save a result.
        </Notice>
      ) : assessment.needs_recalculation ? (
        <Notice
          tone="warn"
          title="Changed since this was calculated"
          action={
            <Link href={`${base}/review`} className={buttonStyles({ variant: 'primary' })}>
              Calculate again
            </Link>
          }
        >
          This is the last saved result. Calculate again to include the changes.
        </Notice>
      ) : null}

      <Panel>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
          <div>
            <p className="text-[15px] text-muted">
              <Term k="level">B-BBEE level</Term>
            </p>
            <p className="font-serif text-4xl font-semibold text-ink">{isFinal ? level.value : 'Not final yet'}</p>
            <p className="mt-1 text-base tabular-nums text-ink">
              {formatPoints(result.rawTotalPoints)} points
              {usingStored && result.readiness.complete ? (
                <span className="text-muted">
                  {' '}
                  · <Term k="recognitionLevel">recognition</Term> {result.finalLevel.recognitionPercentage}%
                </span>
              ) : null}
            </p>
          </div>
          <LevelLadder level={isFinal ? level.value : null} />
        </div>
        {usingStored && result.discountApplied ? (
          <p className="mt-4 rounded-control bg-warn-soft px-4 py-3 text-[15px] text-ink">
            The points reach {result.preliminaryLevel.level}, but the level was dropped by one because{' '}
            {failed.length === 1 ? 'a' : failed.length}{' '}
            <Term k="subMinimum">priority sub-minimum{failed.length === 1 ? ' was' : 's were'}</Term> missed:{' '}
            {failed.map((f) => f.label).join('; ')}.
          </p>
        ) : null}
        {!isFinal && stored ? (
          <div className="mt-4 text-[15px] text-ink">
            <p className="font-semibold">Still needed for a final level:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
              {[...new Set(result.readiness.reasons)].slice(0, 5).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <Link href={`${base}/review`} className="mt-2 inline-block font-semibold text-brand hover:underline">
              See everything that is missing
            </Link>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5" data-tour="scorecard-export">
          <Link href={`/scorecards/calculator/${assessmentId}/report`} className={buttonStyles({ variant: 'primary' })}>
            <FileText className="h-4 w-4" aria-hidden /> Open the report (print or save as PDF)
          </Link>
          <Link href={`${base}/review`} className={buttonStyles({ variant: 'secondary' })}>
            Calculate again
          </Link>
        </div>
      </Panel>

      <Panel title="Points by element" flush>
        <div className="relative overflow-x-auto" data-tour="scorecard-results">
          <table className="min-w-full text-left text-[15px]">
            <thead className="bg-sunken text-sm text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Element</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Points</th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {result.elements.map((element) => (
                <tr key={element.elementKey} className="border-t border-line">
                  <td className="px-5 py-3 text-ink">{element.displayName}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-ink">
                    {formatElementPoints(element.basePointsAchieved, element.basePointsAvailable)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-muted">
                    {element.bonusPointsAvailable > 0
                      ? `${formatPoints(element.bonusPointsAchieved)} / ${formatPoints(element.bonusPointsAvailable)}`
                      : '—'}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-line-strong bg-sunken">
                <td className="px-5 py-3 font-semibold text-ink">Total</td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-ink">
                  {formatPoints(result.totalBasePointsAchieved)} / {formatPoints(result.totalBasePointsAvailable)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-ink">
                  {formatPoints(result.totalBonusPointsAchieved)} / {formatPoints(result.totalBonusPointsAvailable)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title={<Term k="subMinimum">Priority sub-minimums</Term>}
        description="Each of these must reach 40% of its points, or the level drops by one."
      >
        <ul className="divide-y divide-line rounded-control border border-line">
          {result.prioritySubminimums.map((outcome) => (
            <li key={outcome.key} className="px-4 py-3 text-[15px]">
              <p className="font-semibold text-ink">
                {outcome.label}{' '}
                <span className={!outcome.evaluated ? 'text-muted' : outcome.passed ? 'text-ok' : 'text-bad'}>
                  ({!outcome.evaluated ? 'not tested yet' : outcome.passed ? 'met' : 'missed'})
                </span>
              </p>
              <p className="text-muted">{outcome.explanation}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <MoreOptions label="How each element was worked out">
        {result.elements.map((element) => (
          <details key={element.elementKey} className="rounded-control border border-line bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-[15px] font-semibold text-ink">
              {element.displayName}: {formatElementPoints(element.basePointsAchieved, element.basePointsAvailable)} points
            </summary>
            <div className="border-t border-line p-3">
              <IndicatorTable element={element} />
            </div>
          </details>
        ))}
        {result.warnings.length > 0 ? (
          <div>
            <p className="text-[15px] font-semibold text-ink">Notes from the calculation</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-muted">
              {[...new Set(result.warnings)].map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-sm text-muted">
          Rules: {GENERIC_CODES_USER_LABEL} ({result.ruleSetKey}, version {result.ruleSetVersion}).
          {usingStored ? ` ${result.headlineMessage}` : ''}
        </p>
      </MoreOptions>

      <p className="text-sm text-muted">
        This is a scorecard calculator and readiness tool. It does not issue a verified B-BBEE certificate; results remain
        subject to evidence review by an accredited verification agency.
      </p>
    </Shell>
  )
}
