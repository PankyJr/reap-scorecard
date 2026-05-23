import { cn } from '@/components/marketing/cn'

export function ServicePlusIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center border border-slate-900',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-slate-900" fill="none">
        <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1" strokeLinecap="square" />
      </svg>
    </span>
  )
}
