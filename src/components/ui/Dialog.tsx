'use client'

import type { ReactNode } from 'react'
import { Dialog as D } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from './cn'

/**
 * Modal dialog (shadcn/ui on Radix, restyled to tokens). Focus is trapped and
 * returned, Esc closes, the page behind cannot scroll.
 */
export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

export function DialogContent(args: {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  /** False while an action runs, so it cannot be dismissed half-way. */
  dismissible?: boolean
  hideTitle?: boolean
}) {
  const dismissible = args.dismissible ?? true
  return (
    <D.Portal>
      <D.Overlay className="reap-fade-in fixed inset-0 z-50 bg-scrim" />
      <D.Content
        onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
        onPointerDownOutside={(e) => !dismissible && e.preventDefault()}
        className={cn(
          'reap-pop-in fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-raised p-6 shadow-pop focus:outline-none',
          args.className,
        )}
      >
        <D.Title className={cn('pr-8 text-section font-semibold text-ink', args.hideTitle && 'sr-only')}>{args.title}</D.Title>
        {args.description ? <D.Description className="mt-1.5 text-meta text-label">{args.description}</D.Description> : <D.Description className="sr-only">{args.title}</D.Description>}
        {args.children ? <div className="mt-4">{args.children}</div> : null}
        {args.footer ? <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{args.footer}</div> : null}
        {dismissible ? (
          <D.Close className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-sm text-label transition-colors duration-150 hover:bg-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30" aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </D.Close>
        ) : null}
      </D.Content>
    </D.Portal>
  )
}
