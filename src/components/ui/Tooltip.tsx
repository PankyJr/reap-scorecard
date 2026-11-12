'use client'

import type { ReactNode } from 'react'
import { Tooltip as T } from 'radix-ui'
import { cn } from './cn'

/**
 * Compliance Cards dark tooltip: near-black, light text, 10px radius. Opens on
 * hover AND keyboard focus; Esc closes. Never put the only copy of
 * information in a tooltip on a touch screen: also show it in the page.
 */
export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <T.Provider delayDuration={150} skipDelayDuration={300}>
    {children}
  </T.Provider>
)

export function Tooltip(args: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <T.Root open={args.open} onOpenChange={args.onOpenChange}>
      <T.Trigger asChild>{args.children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={args.side ?? 'top'}
          sideOffset={8}
          collisionPadding={12}
          className={cn('reap-pop-in z-50 max-w-[18rem] rounded-control bg-tooltip px-3.5 py-3 text-body text-tooltip-ink shadow-pop', args.className)}
        >
          {args.content}
          <T.Arrow className="fill-tooltip" width={12} height={6} />
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
