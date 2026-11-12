import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Num } from '@/components/ui/Num'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'
import { formatCeiling } from '@/components/ui/format'
import { ScoreRings } from './Rings'
import { heroSentence, type ElementGroupKey, type ScorecardView } from './scorecard-view'

/** One-word legend names (the card is narrow). */
const LEGEND: Record<ElementGroupKey, string> = { own: 'Ownership', mc: 'Mgmt', skills: 'Skills', esd: 'ESD', sed: 'SED' }

/** White-tinted capsule for the teal card (the same words as everywhere else). */
function TealChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full bg-on-teal-line px-2 text-caps font-medium text-on-teal">{children}</span>
}

/**
 * The score card (Brownee's assessment card) in deep REAP teal: light-tint
 * rings on a white-at-12% track, white figures, white-tinted capsules, a white
 * button. Home adds a right column of facts behind a hairline.
 *
 *   [rings]   B-BBEE score · company… · year    | Areas done      0 of 7
 *             23.08 of 109 points               | Company size    QSE
 *             [Non-compliant] [Not final]       | Procurement     23.88 of 25
 *             7 areas still need figures.
 *             [Continue scorecard]
 *   ● Ownership ● Mgmt ● Skills ● ESD ● SED
 *
 * Compact (scorecard and area pages): 120px rings, 28px score, an area
 * emphasised and the rest at 30%.
 */
export function ScoreCard(args: {
  /** data-help id, for page help and tours. */
  helpId?: string
  view: ScorecardView
  company: string
  year?: number | null
  /** The one primary action ("Continue scorecard"). */
  action?: { href: string; label: string } | null
  previousTotal?: number | null
  compact?: boolean
  emphasis?: ElementGroupKey | null
  /** Rings above the figures, for a narrow side column. */
  stacked?: boolean
  /** Home only: the right column, existing data only. */
  facts?: Array<{ label: string; value: React.ReactNode }>
  fillKey: string
  className?: string
}) {
  const { view } = args
  const sentence = heroSentence(view)
  // The level capsule already says "Non-compliant": the sentence keeps only the reason.
  const line = sentence.reason ?? sentence.lead
  const delta = args.previousTotal != null && Math.abs(view.total - args.previousTotal) >= 0.005 ? view.total - args.previousTotal : null
  return (
    <section aria-labelledby="score-card-label" data-help={args.helpId} className={cn('flex min-w-0 flex-col gap-5 rounded-card bg-brand p-5 text-on-teal sm:p-6', args.className)}>
      <div className={cn('flex flex-col gap-6', !args.stacked && 'sm:flex-row sm:items-center')}>
        <div className={cn('flex justify-center', !args.stacked && 'sm:block')}>
          <ScoreRings groups={view.groups} size={args.compact ? 120 : 180} emphasis={args.emphasis ?? null} fillKey={args.fillKey} onTeal />
        </div>
        <div className="min-w-0 flex-1">
          {/* One line: the company name gives way (ellipsis, full name on hover), never the year. */}
          <p id="score-card-label" className="flex min-w-0 items-baseline whitespace-nowrap text-meta text-on-teal-muted">
            <span className="shrink-0">B-BBEE score ·&nbsp;</span>
            <span className="min-w-0 truncate" title={args.company}>
              {args.company}
            </span>
            {args.year ? <span className="shrink-0">&nbsp;· {args.year}</span> : null}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <Num value={view.total} className={cn('font-semibold text-on-teal', args.compact ? 'text-metric' : 'text-score')} />
            <span className="text-body text-on-teal-muted">of {formatCeiling(view.available)} points</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {/* Final: the level alone ("Level 4"). Not final: the level plus "Not final". */}
            <TealChip>{view.level}</TealChip>
            {view.isFinal ? null : <TealChip>Not final</TealChip>}
            {delta != null ? (
              <span className="ml-1 text-caps tabular-nums text-on-teal-muted">
                <span className="font-semibold text-on-teal">
                  {delta >= 0 ? '+' : '−'}
                  {Math.abs(delta).toFixed(2)}
                </span>{' '}
                since last calculated
              </span>
            ) : null}
          </div>
          {args.compact ? null : <p className="mt-4 max-w-[52ch] text-body text-on-teal-muted">{line}</p>}
          {args.action ? (
            <Link href={args.action.href} className={buttonStyles({ variant: 'onTeal', className: 'mt-5' })}>
              {args.action.label} <ArrowRight aria-hidden />
            </Link>
          ) : null}
        </div>
        {args.facts && args.facts.length > 0 ? (
          <dl className="grid shrink-0 gap-4 border-t border-on-teal-line pt-5 sm:w-44 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            {args.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-caps text-on-teal-muted">{fact.label}</dt>
                <dd className="mt-0.5 text-section font-semibold tabular-nums text-on-teal">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caps text-on-teal-muted" aria-label="Rings, outside in">
        {view.groups.map((group) => (
          <li key={group.key} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', group.colourOnTeal)} aria-hidden />
            {LEGEND[group.key]}
          </li>
        ))}
      </ul>
    </section>
  )
}
