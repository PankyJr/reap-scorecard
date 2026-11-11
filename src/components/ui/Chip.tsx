import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * One status vocabulary, four statuses, the same words on every page.
 *
 *   neutral    not started, procurement only, no scorecards yet
 *   progress   in progress, being worked on, imported data to check
 *   attention  needs something from you, below a minimum, changed since calculated
 *   success    finished, a final level
 *
 * 22px tall, 12px medium, fully rounded, a 6px dot then the label, soft
 * background with darker text.
 */
export type ChipTone = 'neutral' | 'progress' | 'attention' | 'success'

const toneClass: Record<ChipTone, string> = {
  neutral: 'bg-neutral-soft text-neutral',
  progress: 'bg-progress-soft text-progress',
  attention: 'bg-attention-soft text-attention',
  success: 'bg-success-soft text-success',
}

const dotClass: Record<ChipTone, string> = {
  neutral: 'bg-neutral',
  progress: 'bg-progress',
  attention: 'bg-attention',
  success: 'bg-success',
}

export function Chip({ tone = 'neutral', className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium', toneClass[tone], className)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass[tone])} aria-hidden />
      {children}
    </span>
  )
}

/** Every older status tone, folded into the four. */
export function chipToneFor(tone: 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'brand'): ChipTone {
  switch (tone) {
    case 'ok':
      return 'success'
    case 'warn':
    case 'bad':
      return 'attention'
    case 'info':
    case 'brand':
      return 'progress'
    default:
      return 'neutral'
  }
}

/** "+6.00 since last calculated". */
export function DeltaPill({ value, suffix, decimals = 2, className }: { value: number; suffix: string; decimals?: number; className?: string }) {
  const up = value >= 0
  return (
    <Chip tone={up ? 'success' : 'attention'} className={cn('tabular-nums', className)}>
      {up ? '+' : '−'}
      {Math.abs(value).toFixed(decimals)} {suffix}
    </Chip>
  )
}
