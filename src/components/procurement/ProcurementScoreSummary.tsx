import type { ReactNode } from 'react'
import { MoreOptions } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Term } from '@/components/ui/Term'
import { ProcurementScorecardTable } from '@/components/procurement/ProcurementScorecardTable'
import { formatPoints } from '@/lib/procurement/format'
import type { ProcurementAssessmentResult } from '@/lib/procurement/assessment'
import { FAR_OFF_SHARE_OF_TARGET, type ProcurementScoreSummary } from '@/lib/procurement/scoreSummary'
import type { ProcurementScoreLineView } from './ProcurementScoreLines'

/** The fields the score lines need (keeps the client props small). */
export function procurementLineViews(summary: ProcurementScoreSummary): ProcurementScoreLineView[] {
  return summary.lines.map((line) => ({
    key: line.key,
    label: line.label,
    isBonus: line.isBonus,
    achievedPercent: line.achievedPercent,
    targetPercent: line.targetPercent,
    pointsAchieved: line.pointsAchieved,
    availablePoints: line.availablePoints,
    tone: line.tone,
    progress: line.progress,
  }))
}

/**
 * The score as the full scorecard counts it: base points out of 25, the bonus
 * apart, and "Incomplete" while anything in the supplier list needs attention.
 */
export function ProcurementScoreHeadline({
  summary,
  incomplete,
  gapSentence,
  children,
}: {
  summary: ProcurementScoreSummary
  incomplete: boolean
  gapSentence: string
  children?: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <p className="font-serif text-4xl font-semibold tabular-nums text-ink">
          {formatPoints(summary.basePoints)}
          <span className="ml-2 font-sans text-lg font-normal text-muted">/ {summary.baseCap} points</span>
        </p>
        <p className="rounded-full bg-brand-soft px-3 py-1 text-[15px] text-brand">
          <strong className="tabular-nums">+ {formatPoints(summary.bonusPoints)}</strong> bonus{' '}
          <span className="text-brand/80">of {summary.bonusCap}</span>
        </p>
        {incomplete ? <StatusBadge tone="warn">Incomplete</StatusBadge> : null}
      </div>
      <p className="max-w-[70ch] text-[15px] text-ink">{gapSentence}</p>
      {children}
    </div>
  )
}

/** The formula, the caps and the uncapped figure, for anyone who wants to check. */
export function HowIsThisCalculated({
  summary,
  result,
  denominatorNote,
}: {
  summary: ProcurementScoreSummary
  result: ProcurementAssessmentResult
  denominatorNote?: string | null
}) {
  const baseLines = summary.lines.filter((l) => !l.isBonus)
  const baseAvailable = baseLines.reduce((sum, l) => sum + l.availablePoints, 0)
  return (
    <MoreOptions label="How is this calculated?">
      <ul className="list-disc space-y-2 pl-5 text-[15px] text-ink">
        <li>
          <Term k="recognisedSpend">Recognised spend</Term> is what was spent with a supplier times its{' '}
          <Term k="recognitionLevel">recognition level</Term> (Level 1 counts 135%, Non-compliant counts nothing), and 1.2
          times that for <Term k="flowThrough">51% flow-through</Term>.
        </li>
        <li>
          For each line, <strong>their share</strong> is the recognised spend with the suppliers in that line divided by the{' '}
          <Term k="tmps">total measured procurement spend</Term>.
        </li>
        <li>
          <strong>Points</strong> are their share divided by the target, times the line’s points, and never more than the
          line’s points.
        </li>
        <li>
          The {baseLines.length} base lines are worth {formatPoints(baseAvailable, 0)} points together, but the scorecard counts
          at most {summary.baseCap} (Codes of Good Practice, Statement 000). The <Term k="bonusPoints">bonus</Term> line adds up
          to {summary.bonusCap} more, shown separately.
        </li>
        <li>
          Before that limit the base lines add up to <strong className="tabular-nums">{formatPoints(summary.uncappedBasePoints)}</strong>{' '}
          points{summary.baseWasCapped ? `, of which ${summary.baseCap} count` : ''}. All six lines together come to{' '}
          <strong className="tabular-nums">{formatPoints(summary.moduleTotal)}</strong> of{' '}
          {formatPoints(summary.lines.reduce((sum, l) => sum + l.availablePoints, 0), 0)}, the figure in the table below.
        </li>
        <li>
          Colours: green is at or above the target; amber is at least {Math.round(FAR_OFF_SHARE_OF_TARGET * 100)}% of the way
          there; red is far off, below {Math.round(FAR_OFF_SHARE_OF_TARGET * 100)}% of the target.
        </li>
      </ul>
      <ProcurementScorecardTable result={result} tmpsDenominatorNote={denominatorNote} />
    </MoreOptions>
  )
}
