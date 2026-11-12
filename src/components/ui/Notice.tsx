import type { ReactNode } from 'react'
import { Callout, type CalloutTone } from './Callout'

export type NoticeTone = 'ok' | 'warn' | 'bad' | 'info'

const TONE: Record<NoticeTone, CalloutTone> = { ok: 'success', warn: 'attention', bad: 'danger', info: 'neutral' }

/**
 * A message in the flow of the page (older name for Callout). Errors say what
 * went wrong and what to do; `action` is where the fix is.
 */
export function Notice(args: { tone?: NoticeTone; title?: ReactNode; children?: ReactNode; action?: ReactNode; role?: 'status' | 'alert'; className?: string }) {
  return <Callout tone={TONE[args.tone ?? 'info']} title={args.title} action={args.action} role={args.role} className={args.className}>{args.children}</Callout>
}
