import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, PencilLine } from 'lucide-react'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { finalLevelDisplay, GENERIC_CODES_USER_LABEL } from '@/lib/scorecard/generic/ux/workflow'
import { AREA_COPY, failedMinimum, plainLevelSentence, resultBars, whereToGainPoints, type AreaKey, type ResultBarTone } from '@/lib/scorecard/generic/ux/areas'
import { COMPANY_SIZE_BANDS } from '@/lib/scorecard/rules/company-size'
import { createClient } from '@/utils/supabase/server'
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

const BAR: Record<ResultBarTone, { bar: string; word: string; text: string }> = {
  healthy: { bar: 'bg-ok', word: 'Healthy', text: 'text-ok' },
  weak: { bar: 'bg-warn', word: 'Weak', text: 'text-warn' },
  dragging: { bar: 'bg-bad', word: 'Dropping the level', text: 'text-bad' },
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
  const failed = result.prioritySubminimums.filter((p) => p.evaluated && p.passed === false)
  const bars = resultBars(result)
  const gains = whereToGainPoints(result)
  const size = result.applicability?.classification
  const sizeWords = size && size !== 'unresolved' ? COMPANY_SIZE_BANDS[size].name : null
  const workedOut = stored?.calculatedAt ? new Date(stored.calculatedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  // Last year's scorecard for the same company, if it was worked out.
  const supabase = await createClient()
  const { data: previousRow } = await supabase
    .from('scorecard_assessments')
    .select('id, measurement_year, overall_result_snapshot')
    .eq('company_id', company.id)
    .lt('measurement_year', assessment.measurement_year)
    .not('overall_result_snapshot', 'is', null)
    .order('measurement_year', { ascending: false })
    .limit(1)
    .maybeSingle()
  const previous = previousRow?.overall_result_snapshot as GenericScorecardCalculation | null | undefined

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="result"
      title="Final result"
      subtitle={`${company.name}${sizeWords ? ` · ${sizeWords}` : ''}${workedOut ? ` · Worked out ${workedOut}` : ''}`}
      workflow={workflow}
    >
      <Flash searchParams={query} />

      {!stored ? (
        <Notice
          tone="warn"
          title="Not calculated yet"
          action={
            <Link href={`${base}/review`} className={buttonStyles({ variant: 'primary' })}>
              Review my scorecard
            </Link>
          }
        >
          These are working figures only. Review the scorecard and calculate to get a result.
        </Notice>
      ) : assessment.needs_recalculation ? (
        <Notice
          tone="warn"
          title="Changed since this was worked out"
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
        <p className="inline-block rounded-full bg-sunken px-3 py-1 text-sm font-medium text-muted">
          Draft, not a verified B-BBEE certificate
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
          <div data-total-points={result.rawTotalPoints} data-level={isFinal ? level.value : ''}>
            <p className="text-[15px] text-muted">
              <Term k="level">B-BBEE level</Term>
            </p>
            <p className="font-serif text-5xl font-semibold text-ink">{isFinal ? level.value : 'Not final yet'}</p>
            <p className="mt-2 text-base tabular-nums text-ink">
              {formatPoints(result.totalBasePointsAchieved)} points
              {result.totalBonusPointsAchieved > 0 ? ` + ${formatPoints(result.totalBonusPointsAchieved)} bonus` : ''}
              {usingStored && isFinal ? (
                <span className="text-muted">
                  {' '}
                  · <Term k="recognitionLevel">recognition</Term> {result.finalLevel.recognitionPercentage}%
                </span>
              ) : null}
            </p>
          </div>
          <LevelLadder level={isFinal ? level.value : null} />
        </div>

        {usingStored && isFinal ? (
          <p className="mt-4 text-lg text-ink">{plainLevelSentence(level.value, result.finalLevel.recognitionPercentage)}</p>
        ) : null}

        {usingStored && result.discountApplied ? (
          <p className="mt-3 rounded-control bg-bad-soft px-4 py-3 text-[15px] text-ink">
            The points reach {result.preliminaryLevel.level}, but the level dropped by one because{' '}
            {failed.map((f) => AREA_COPY[f.elementKey as AreaKey]?.label ?? f.label).join(' and ')}{' '}
            {failed.length === 1 ? 'is' : 'are'} below the <Term k="subMinimum">minimum</Term>.
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
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5" data-tour="scorecard-export">
          <a href={`/api/scorecards/calculator/${assessmentId}/pdf`} className={buttonStyles({ variant: 'primary' })}>
            <Download className="h-4 w-4" aria-hidden /> Download report
          </a>
          <Link href={`/scorecards/calculator/${assessmentId}/report`} className={buttonStyles({ variant: 'secondary' })}>
            Printable version
          </Link>
          <Link href={base} className={buttonStyles({ variant: 'secondary' })}>
            <PencilLine className="h-4 w-4" aria-hidden /> Edit data
          </Link>
          {previous ? (
            <a href="#compare" className={buttonStyles({ variant: 'secondary' })}>
              Compare with {previousRow?.measurement_year}
            </a>
          ) : null}
        </div>
      </Panel>

      <div data-tour="scorecard-results">
      <Panel title="Points by area">
        <ul className="space-y-4">
          {bars.map((bar) => {
            const tone = BAR[bar.tone]
            const share = bar.available > 0 ? Math.min(1, bar.achieved / bar.available) : 0
            const minimum = failedMinimum(result, bar.key)
            return (
              <li key={bar.key} data-area={bar.key} data-points={bar.achieved} data-bonus={bar.bonusAchieved}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <Link href={`${base}/${AREA_COPY[bar.key]?.slug ?? ''}`} className="text-[15px] font-semibold text-ink hover:text-brand hover:underline">
                    {bar.label}
                  </Link>
                  <span className="text-[15px] tabular-nums text-ink">
                    {formatElementPoints(bar.achieved, bar.available)}
                    {bar.bonusAvailable > 0 ? <span className="text-muted"> · bonus {formatPoints(bar.bonusAchieved)}</span> : null}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${share * 100}%` }} />
                </div>
                <p className={`mt-1 text-sm ${tone.text}`}>
                  {tone.word}
                  {minimum ? `: ${formatPoints(minimum.achievedPoints ?? 0)} of the ${formatPoints(minimum.thresholdPoints)} points needed` : ''}
                </p>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
          Red: below its minimum, so it dropped the level. Amber: under half of its points. Green: half or more.
        </p>
      </Panel>
      </div>

      {gains.length > 0 ? (
        <Panel title="Where to gain points" description="The three lines with the most points still to win.">
          <ol className="space-y-3">
            {gains.map((gain, i) => (
              <li key={`${gain.area}-${gain.name}`} className="flex gap-3 text-[15px]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{i + 1}</span>
                <span>
                  <Link href={`${base}/${gain.href}`} className="font-semibold text-ink hover:text-brand hover:underline">
                    {gain.area}: {gain.name}
                  </Link>{' '}
                  <span className="tabular-nums text-muted">
                    {formatPoints(gain.achieved)} of {formatPoints(gain.available)} points
                  </span>
                  <span className="block text-sm text-muted">{gain.why}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      {previous ? (
        <Panel id="compare" title={`Compared with ${previousRow?.measurement_year}`} flush>
          <div className="relative overflow-x-auto">
            <table className="min-w-full text-left text-[15px]">
              <thead className="bg-sunken text-sm text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Area</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">{previousRow?.measurement_year}</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">{assessment.measurement_year}</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {result.elements.map((element) => {
                  const before = previous.elements.find((e) => e.elementKey === element.elementKey)?.basePointsAchieved ?? null
                  const change = before == null ? null : element.basePointsAchieved - before
                  return (
                    <tr key={element.elementKey} className="border-t border-line">
                      <td className="px-5 py-2.5 text-ink">{AREA_COPY[element.elementKey as AreaKey]?.label ?? element.displayName}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted">{before == null ? '—' : formatPoints(before)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">{formatPoints(element.basePointsAchieved)}</td>
                      <td className={`px-5 py-2.5 text-right tabular-nums ${change == null || Math.abs(change) < 0.005 ? 'text-muted' : change > 0 ? 'text-ok' : 'text-bad'}`}>
                        {change == null ? '—' : `${change > 0 ? '+' : ''}${formatPoints(change)}`}
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-line-strong bg-sunken font-semibold">
                  <td className="px-5 py-2.5 text-ink">Level</td>
                  <td className="px-3 py-2.5 text-right text-ink">{previous.readiness?.complete ? previous.finalLevel.level : 'Not final'}</td>
                  <td className="px-3 py-2.5 text-right text-ink">{isFinal ? level.value : 'Not final'}</td>
                  <td className="px-5 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <MoreOptions label="Priority areas and their minimums">
        <p className="text-[15px] text-muted">Each must reach 40% of its points, or the level drops by one.</p>
        <ul className="divide-y divide-line rounded-control border border-line bg-surface">
          {result.prioritySubminimums.map((outcome) => (
            <li key={outcome.key} className="px-4 py-3 text-[15px]">
              <p className="font-semibold text-ink">
                {AREA_COPY[outcome.elementKey as AreaKey]?.label ?? outcome.label}{' '}
                <span className={!outcome.evaluated ? 'text-muted' : outcome.passed ? 'text-ok' : 'text-bad'}>
                  ({!outcome.evaluated ? 'not tested yet' : outcome.passed ? 'met' : 'missed'})
                </span>
              </p>
              <p className="text-muted">{outcome.explanation}</p>
            </li>
          ))}
        </ul>
      </MoreOptions>

      <MoreOptions label="How each area was worked out">
        {result.elements.map((element) => (
          <details key={element.elementKey} className="rounded-control border border-line bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-[15px] font-semibold text-ink">
              {AREA_COPY[element.elementKey as AreaKey]?.label ?? element.displayName}:{' '}
              {formatElementPoints(element.basePointsAchieved, element.basePointsAvailable)} points
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
        A draft worked out by a scorecard calculator, not a verified B-BBEE certificate. Results remain subject to evidence
        review by an accredited verification agency.
      </p>
    </Shell>
  )
}
