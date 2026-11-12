import { cn } from './cn'

/** An inline progress bar (64x4, teal) beside a figure: "15.98 of 109". */
export function MiniBar({ value, max, colour = 'bg-teal', className, width = 'w-16' }: { value: number; max: number; colour?: string; className?: string; width?: string }) {
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <span className={cn('inline-block h-1 shrink-0 overflow-hidden rounded-full bg-track align-middle', width, className)} aria-hidden>
      <span className={cn('block h-full rounded-full', colour)} style={{ width: `${share * 100}%` }} />
    </span>
  )
}
