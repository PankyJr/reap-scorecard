import type { ReactNode } from 'react'
import { AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn } from './cn'

/**
 * Untitled UI callout: a soft tinted box, a 16px icon, a medium title and a
 * grey line. Neutral for information, amber for attention, red for errors.
 */
export function Callout(args: { tone?: 'neutral' | 'attention' | 'danger'; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const tone = args.tone ?? 'neutral'
  const Icon = tone === 'attention' ? AlertTriangle : tone === 'danger' ? XCircle : Info
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-control border px-4 py-3',
        tone === 'neutral' && 'border-line bg-sunken',
        tone === 'attention' && 'border-attention/20 bg-attention-soft',
        tone === 'danger' && 'border-danger/20 bg-danger-soft',
        args.className,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'neutral' ? 'text-icon' : tone === 'attention' ? 'text-attention' : 'text-danger')} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {args.title ? <p className="text-body font-medium text-ink">{args.title}</p> : null}
        {args.children ? <div className="text-meta text-label">{args.children}</div> : null}
        {args.action ? <div className="pt-1.5">{args.action}</div> : null}
      </div>
    </div>
  )
}
