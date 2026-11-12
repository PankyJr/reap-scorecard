import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from './cn'

export type CalloutTone = 'neutral' | 'attention' | 'danger' | 'success'

const FRAME: Record<CalloutTone, string> = {
  neutral: 'border-line bg-sunken',
  attention: 'border-attention/20 bg-attention-soft',
  danger: 'border-danger/20 bg-danger-soft',
  success: 'border-success/20 bg-success-soft',
}
const ICON = { neutral: Info, attention: AlertTriangle, danger: XCircle, success: CheckCircle2 }
const ICON_TINT: Record<CalloutTone, string> = { neutral: 'text-icon', attention: 'text-attention', danger: 'text-danger', success: 'text-success' }

/**
 * Untitled UI callout: a soft tinted box, a 16px icon, a medium title and a
 * grey line. Neutral for information, amber for attention, red for errors,
 * green only to confirm something just happened.
 */
export function Callout(args: { tone?: CalloutTone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string; role?: 'status' | 'alert' }) {
  const tone = args.tone ?? 'neutral'
  const Icon = ICON[tone]
  return (
    <div role={args.role ?? (tone === 'danger' ? 'alert' : 'status')} className={cn('flex gap-3 rounded-control border px-4 py-3', FRAME[tone], args.className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_TINT[tone])} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {args.title ? <p className="text-body font-medium text-ink">{args.title}</p> : null}
        {args.children ? <div className="text-meta text-label">{args.children}</div> : null}
        {args.action ? <div className="pt-1.5">{args.action}</div> : null}
      </div>
    </div>
  )
}
