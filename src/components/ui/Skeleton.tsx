import { cn } from './cn'

/**
 * Design rule 1: placeholders shaped like the real content, at its real size,
 * so nothing moves when the data arrives. Never a full-page spinner.
 * Opacity pulse only; stops under reduced motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('reap-skeleton block rounded-sm bg-track', className)} />
}

/** A text line: height matches the line box of the size it stands in for. */
export function SkeletonText({ size = 'sm', width = 'w-32', className }: { size?: 'xs' | 'sm' | 'base' | 'lg' | 'title' | 'hero'; width?: string; className?: string }) {
  const box = { xs: 'h-4 py-[3px]', sm: 'h-5 py-1', base: 'h-6 py-1', lg: 'h-7 py-1', title: 'h-[34px] py-1', hero: 'h-14 py-1' }[size]
  return (
    <span aria-hidden className={cn('block', box, width, className)}>
      <span className="reap-skeleton block h-full rounded-sm bg-track" />
    </span>
  )
}

/** Screen-reader announcement for a loading region (the skeletons are hidden from it). */
export function LoadingRegion({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
