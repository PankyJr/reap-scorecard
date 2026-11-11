import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Design rule 10: one status vocabulary, one colour set.
 *
 *   neutral    not started, procurement only, draft
 *   progress   in progress, being worked on
 *   attention  needs something from you, below a minimum
 *   success    done, a final level
 *   danger     failed, cannot continue
 *
 * FinTrack chip: small, soft background, darker text, fully rounded.
 */
export type ChipTone = 'neutral' | 'progress' | 'attention' | 'success' | 'danger' | 'brand'

const toneClass: Record<ChipTone, string> = {
  neutral: 'bg-neutral-soft text-neutral',
  progress: 'bg-progress-soft text-progress',
  attention: 'bg-attention-soft text-attention',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  brand: 'bg-brand-soft text-brand',
}

const dotClass: Record<ChipTone, string> = {
  neutral: 'bg-neutral',
  progress: 'bg-progress',
  attention: 'bg-attention',
  success: 'bg-success',
  danger: 'bg-danger',
  brand: 'bg-brand',
}

export function Chip({
  tone = 'neutral',
  dot = false,
  size = 'md',
  className,
  children,
}: {
  tone?: ChipTone
  /** A 6px dot before the label, for lists where colour is the scan cue. */
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
        size === 'sm' ? 'px-2 py-px text-xs' : 'px-2.5 py-0.5 text-xs',
        toneClass[tone],
        className,
      )}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass[tone])} aria-hidden /> : null}
      {children}
    </span>
  )
}

/** The old badge tones (ok/warn/bad/info) in the one vocabulary. */
export function chipToneFor(tone: 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'brand'): ChipTone {
  switch (tone) {
    case 'ok':
      return 'success'
    case 'warn':
      return 'attention'
    case 'bad':
      return 'danger'
    case 'info':
      return 'progress'
    default:
      return tone
  }
}

/** Keel delta pill: "+6.00 since last save". Success when up, attention when down. */
export function DeltaPill({ value, suffix, decimals = 2 }: { value: number; suffix: string; decimals?: number }) {
  const up = value >= 0
  return (
    <Chip tone={up ? 'success' : 'attention'} size="sm" className="tabular-nums">
      {up ? '+' : '−'}
      {Math.abs(value).toFixed(decimals)} {suffix}
    </Chip>
  )
}
