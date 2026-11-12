'use client'

import type { ReactNode } from 'react'
import { useHelpOptional } from './HelpProvider'
import { cn } from '@/components/ui/cn'

/**
 * "How does this work?" (empty states) and "Why?" (a 0 score or a missed
 * minimum): opens this page's help panel, at a matching question if given.
 */
export function HelpLink({ problem, children, className }: { problem?: string; children?: ReactNode; className?: string }) {
  const help = useHelpOptional()
  if (!help) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        help.openPanel(problem ?? null)
      }}
      className={cn(
        'inline-flex min-h-11 items-center rounded-sm text-meta font-medium text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 sm:min-h-0',
        className,
      )}
    >
      {children ?? 'How does this work?'}
    </button>
  )
}

/** A small "Why?" next to a score that is 0 or below a minimum. */
export function WhyLink({ problem, className }: { problem: string; className?: string }) {
  return (
    <HelpLink problem={problem} className={cn('text-meta', className)}>
      Why?
    </HelpLink>
  )
}
