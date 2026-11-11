'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import { cn } from './cn'

/**
 * Partition Bar, rebuilt from the 8starlabs preview on 21st.dev (only its demo
 * code is published): a whole split into proportional parts, each part its
 * own fully rounded pill with a gap between, widths by value.
 *
 * Ours: 8px tall, 4px gaps, a final "remaining" pill for what is not yet
 * earned. Every part is focusable and opens a tooltip on hover or focus (Esc
 * closes). The legend is rendered by the caller, so it can sit in a grid.
 */
export type PartitionPart = {
  key: string
  value: number
  /** Token class for the pill colour. */
  colour: string
  /** Read by screen readers and used as the tooltip trigger name. */
  label: string
  tooltip?: ReactNode
  /** Dims every other part while this one is pointed at. */
  onHover?: (hot: boolean) => void
  dimmed?: boolean
}

export function PartitionBar({
  parts,
  remainder = 0,
  remainderColour = 'bg-track',
  label,
  className,
}: {
  parts: PartitionPart[]
  remainder?: number
  remainderColour?: string
  label: string
  className?: string
}) {
  const shown = parts.filter((p) => p.value > 0)
  return (
    <div role="group" aria-label={label} className={cn('flex h-2 w-full gap-1', className)}>
      {shown.map((part) => {
        const pill = (
          <button
            type="button"
            aria-label={part.label}
            onMouseEnter={() => part.onHover?.(true)}
            onMouseLeave={() => part.onHover?.(false)}
            onFocus={() => part.onHover?.(true)}
            onBlur={() => part.onHover?.(false)}
            className={cn(
              // The pill is 8px; the invisible ::before makes it a 44px-tall target
              // for a mouse. On phones it is not a tap target at all: a tap cannot
              // open a tooltip, and the legend under the bar shows the same figures.
              "relative block max-sm:pointer-events-none h-full min-w-2 rounded-full transition-[opacity,box-shadow] duration-150 before:absolute before:inset-x-0 before:-inset-y-[18px] before:content-[''] hover:ring-2 hover:ring-on-teal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-teal",
              part.colour,
              part.dimmed ? 'opacity-35' : 'opacity-100',
            )}
            style={{ flexGrow: part.value, flexBasis: 0 } as CSSProperties}
          />
        )
        return part.tooltip ? (
          <Tooltip key={part.key} content={part.tooltip}>
            {pill}
          </Tooltip>
        ) : (
          <span key={part.key} className="contents">
            {pill}
          </span>
        )
      })}
      {remainder > 0 ? <span aria-hidden className={cn('block h-full rounded-full', remainderColour)} style={{ flexGrow: remainder, flexBasis: 0 }} /> : null}
    </div>
  )
}
