import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

/**
 * Untitled UI empty state: a small icon in a 40px rounded square, a one-line
 * title, a grey helper line, one button.
 */
export function EmptyState(args: { title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-icon [&_svg]:h-[18px] [&_svg]:w-[18px]">
        {args.icon ?? <Inbox aria-hidden />}
      </div>
      <p className="mt-4 text-section font-semibold text-ink">{args.title}</p>
      {args.children ? <div className="mt-1 max-w-[44ch] text-body text-label">{args.children}</div> : null}
      {args.action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{args.action}</div> : null}
    </div>
  )
}
