import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Status capsules (Halal Lab): 22px, 12px medium, a 10-12% tint of the hue
 * with darker text of the same hue. Five tones, the same words everywhere
 * (components/status/status-copy.ts).
 *
 *   neutral    grey    Not started, No workbook, From your workbook
 *   progress   teal    In progress, Check import
 *   attention  amber   Not final, Recalculate, Below minimum
 *   success    green   Level 4, On track, Scored
 *   danger     red     errors that block
 */
export type ChipTone = 'neutral' | 'progress' | 'attention' | 'success' | 'danger'

const toneClass: Record<ChipTone, string> = {
  neutral: 'bg-neutral-soft text-neutral',
  progress: 'bg-progress-soft text-progress',
  attention: 'bg-attention-soft text-attention',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
}

export function Chip({ tone = 'neutral', icon, className, children }: { tone?: ChipTone; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-caps font-medium [&_svg]:h-3 [&_svg]:w-3', toneClass[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

/** Every older status tone, in the five. */
export function chipToneFor(tone: 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'brand'): ChipTone {
  switch (tone) {
    case 'ok':
      return 'success'
    case 'warn':
      return 'attention'
    case 'bad':
      return 'danger'
    case 'info':
    case 'brand':
      return 'progress'
    default:
      return 'neutral'
  }
}

/** "+6.00 since last calculated": the change in green or red, the words in grey. */
export function DeltaPill({ value, suffix, decimals = 2, className }: { value: number; suffix: string; decimals?: number; className?: string }) {
  const up = value >= 0
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 text-caps tabular-nums', className)}>
      <span className={cn('font-semibold', up ? 'text-success' : 'text-danger')}>
        {up ? '+' : '−'}
        {Math.abs(value).toFixed(decimals)}
      </span>
      <span className="text-label">{suffix}</span>
    </span>
  )
}
