import type { ReactNode } from 'react'
import { CardLabel } from '@/components/ui/Card'
import { Chip, DeltaPill } from '@/components/ui/Chip'
import { CountUp } from '@/components/ui/CountUp'
import { RelativeTime } from '@/components/ui/RelativeTime'
import { cn } from '@/components/ui/cn'
import { formatCeiling } from '@/components/ui/format'
import { plainLevelSentence } from '@/lib/scorecard/generic/ux/areas'
import { heroSentence, type ScorecardView } from './scorecard-view'

/**
 * Wstack hero + Keel balance card.
 *
 *   B-BBEE SCORE · {company} · {year}            (Keel label)
 *   Level 4. Skills development has the most…    (serif 28, the sentence)
 *   Clients can claim 100% of what they spend…   (grey supporting line)
 *   77.43  of 109   [Level 4]                    (serif 56, counts up once)
 *   [+6.00 since last calculated]                (only with a previous result)
 *   Updated 2 min ago
 *
 * Every figure comes from the engine's result (see scorecard-view.ts).
 */
export function ScoreHero(args: {
  view: ScorecardView
  company: string
  year: number | null
  updatedAt: string | null
  /** The engine's total at the last Calculate, if there was one. */
  previousTotal?: number | null
  /** Session key for the one-time count-up (design rule 21). */
  countKey: string
  action?: ReactNode
  className?: string
}) {
  const { view } = args
  const sentence = heroSentence(view)
  const support = view.isFinal
    ? plainLevelSentence(view.level, view.recognition)
    : 'Not final yet: this is the score on the figures entered so far.'
  const delta = args.previousTotal != null && Math.abs(view.total - args.previousTotal) >= 0.005 ? view.total - args.previousTotal : null
  const levelTone = !view.isFinal ? 'neutral' : view.levelNumber == null ? 'attention' : 'success'

  return (
    <div className={cn('flex min-w-0 flex-col', args.className)}>
      <CardLabel className="truncate" as="h2">
        B-BBEE score · {args.company}
        {args.year ? ` · ${args.year}` : ''}
      </CardLabel>

      <p className="mt-4 max-w-[30ch] text-balance font-serif text-title font-semibold text-ink">
        {sentence.lead}
        {sentence.reason ? <span className="font-medium text-label"> {sentence.reason}</span> : null}
      </p>
      <p className="mt-2 max-w-[60ch] text-base text-label">{support}</p>

      <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-2">
        <p className="font-serif text-hero font-semibold leading-none text-ink">
          <CountUp value={view.total} decimals={2} onceKey={args.countKey} />
          <span className="ml-2 font-sans text-lg font-normal text-label">of {formatCeiling(view.available)}</span>
        </p>
        <Chip tone={levelTone} className="mb-1.5">
          {view.level}
          {!view.isFinal ? ' · not final' : ''}
        </Chip>
      </div>

      <div className="mt-3 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1">
        {delta != null ? <DeltaPill value={delta} suffix="since last calculated" /> : null}
        {view.bonusEarned > 0 ? <span className="text-xs text-label">Includes {view.bonusEarned.toFixed(2)} bonus points</span> : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <RelativeTime value={args.updatedAt} className="text-xs text-subtle" />
        {args.action}
      </div>
    </div>
  )
}

