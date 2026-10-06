import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

export type NoticeTone = 'ok' | 'warn' | 'bad' | 'info'

const toneClass: Record<NoticeTone, string> = {
  ok: 'border-ok/30 bg-ok-soft text-ok',
  warn: 'border-warn/30 bg-warn-soft text-warn',
  bad: 'border-bad/30 bg-bad-soft text-bad',
  info: 'border-info/25 bg-info-soft text-info',
}

const toneIcon = { ok: CheckCircle2, warn: AlertTriangle, bad: XCircle, info: Info }

/**
 * A message in the flow of the page. Errors say what went wrong and what to do;
 * `action` is where the fix is (the "legs" rule: never make people go looking).
 */
export function Notice(args: {
  tone?: NoticeTone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  role?: 'status' | 'alert'
}) {
  const tone = args.tone ?? 'info'
  const Icon = toneIcon[tone]
  return (
    <div
      role={args.role ?? (tone === 'bad' ? 'alert' : 'status')}
      className={`flex gap-3 rounded-control border px-4 py-3 ${toneClass[tone]}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1 text-[15px] text-ink">
        {args.title ? <p className="font-semibold">{args.title}</p> : null}
        {args.children ? <div className="text-ink/90">{args.children}</div> : null}
        {args.action ? <div className="pt-1">{args.action}</div> : null}
      </div>
    </div>
  )
}
