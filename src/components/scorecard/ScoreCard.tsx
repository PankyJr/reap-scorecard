import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Chip, DeltaPill, type ChipTone } from '@/components/ui/Chip'
import { CARD_FRAME } from '@/components/ui/Card'
import { Num } from '@/components/ui/Num'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'
import { formatCeiling } from '@/components/ui/format'
import { ScoreRings } from './Rings'
import { heroSentence, type ElementGroupKey, type ScorecardView } from './scorecard-view'

/**
 * The score card (Brownee's assessment card), white, in REAP colours.
 *
 *   [ 5 concentric rings ]   B-BBEE score · company · year
 *                            23.08 of 109 points
 *                            [Level] [status]
 *                            one-line sentence
 *                            [Continue scorecard]
 *
 * Full (Home): 180px rings, 56px score. Compact (scorecard and area pages):
 * 120px rings, 28px score, an area emphasised and the rest at 30%.
 */
export function ScoreCard(args: {
  view: ScorecardView
  company: string
  year?: number | null
  status?: { label: string; tone: ChipTone } | null
  /** The one primary action ("Continue scorecard"). */
  action?: { href: string; label: string } | null
  previousTotal?: number | null
  compact?: boolean
  emphasis?: ElementGroupKey | null
  fillKey: string
  className?: string
}) {
  const { view } = args
  const sentence = heroSentence(view)
  const levelTone: ChipTone = !view.isFinal ? 'neutral' : view.levelNumber == null ? 'attention' : 'success'
  const delta = args.previousTotal != null && Math.abs(view.total - args.previousTotal) >= 0.005 ? view.total - args.previousTotal : null
  return (
    <section aria-labelledby="score-card-label" className={cn('flex min-w-0 flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6', CARD_FRAME, args.className)}>
      <div className="flex justify-center sm:block">
        <ScoreRings groups={view.groups} size={args.compact ? 120 : 180} emphasis={args.emphasis ?? null} fillKey={args.fillKey} />
      </div>
      <div className="min-w-0 flex-1">
        <p id="score-card-label" className="truncate text-meta text-label">
          B-BBEE score · {args.company}
          {args.year ? ` · ${args.year}` : ''}
        </p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <Num value={view.total} className={cn('font-semibold text-ink', args.compact ? 'text-metric' : 'text-score')} />
          <span className="text-body text-label">of {formatCeiling(view.available)} points</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip tone={levelTone}>{view.level}</Chip>
          {args.status ? <Chip tone={args.status.tone}>{args.status.label}</Chip> : null}
          {delta != null ? <DeltaPill value={delta} suffix="since last calculated" className="ml-1" /> : null}
        </div>
        {args.compact ? null : (
          <p className="mt-4 max-w-[52ch] text-body text-label">
            <span className="font-medium text-ink">{sentence.lead}</span>
            {sentence.reason ? ` ${sentence.reason}` : ''}
          </p>
        )}
        {args.action ? (
          <Link href={args.action.href} className={buttonStyles({ variant: 'primary', className: 'mt-5' })}>
            {args.action.label} <ArrowRight aria-hidden />
          </Link>
        ) : null}
      </div>
    </section>
  )
}
