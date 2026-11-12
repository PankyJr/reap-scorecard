'use client'

import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { GraduationCap, Handshake, HeartHandshake, PieChart, Users } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/components/ui/cn'
import { formatCeiling, formatPointsOf, formatPts } from '@/components/ui/format'
import type { ElementGroup, ElementGroupKey } from './scorecard-view'

/**
 * Brownee's assessment rings: one concentric ring per area, in the area's
 * colour, filled to earned / available. They fill once, on the first load of
 * the page in this tab (800ms); after that, and with reduced motion, they are
 * simply drawn full. Hover or focus a ring: area, earned, available, shortfall.
 */

export const AREA_STROKE: Record<ElementGroupKey, string> = {
  own: 'stroke-el-own',
  mc: 'stroke-el-mc',
  skills: 'stroke-el-skills',
  esd: 'stroke-el-esd',
  sed: 'stroke-el-sed',
}

/** Light tints of the five, for rings on the deep-teal score card. */
export const AREA_STROKE_ON_TEAL: Record<ElementGroupKey, string> = {
  own: 'stroke-el-own-on-teal',
  mc: 'stroke-el-mc-on-teal',
  skills: 'stroke-el-skills-on-teal',
  esd: 'stroke-el-esd-on-teal',
  sed: 'stroke-el-sed-on-teal',
}

export const AREA_TEXT: Record<ElementGroupKey, string> = {
  own: 'text-el-own',
  mc: 'text-el-mc',
  skills: 'text-el-skills',
  esd: 'text-el-esd',
  sed: 'text-el-sed',
}

export const AREA_ICON: Record<ElementGroupKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  own: PieChart,
  mc: Users,
  skills: GraduationCap,
  esd: Handshake,
  sed: HeartHandshake,
}

const drawn = new Set<string>()

/** True on the first render of this key in this tab, then false. */
function useFirstFill(key: string): boolean {
  const [first] = useState(() => !drawn.has(key))
  const [filled, setFilled] = useState(!first)
  useEffect(() => {
    drawn.add(key)
    if (!first) return
    const frame = requestAnimationFrame(() => setFilled(true))
    return () => cancelAnimationFrame(frame)
  }, [key, first])
  return filled
}

export function ScoreRings({
  groups,
  size = 180,
  emphasis = null,
  fillKey,
  className,
  onTeal = false,
}: {
  groups: ElementGroup[]
  size?: 180 | 120
  /** On the deep-teal card: light tints on a white-at-12% track. */
  onTeal?: boolean
  /** Dim every ring but this one to 30% (area pages). */
  emphasis?: ElementGroupKey | null
  /** Rings fill once per key per tab. */
  fillKey: string
  className?: string
}) {
  const filled = useFirstFill(fillKey)
  const stroke = size === 180 ? 11 : 8
  const gap = size === 180 ? 5 : 3.5
  const centre = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn('shrink-0 -rotate-90', className)} role="img" aria-label={groups.map((g) => `${g.label} ${formatPointsOf(g.earned, g.available)}`).join(', ')}>
      {groups.map((group, index) => {
        const r = centre - stroke / 2 - index * (stroke + gap)
        const length = 2 * Math.PI * r
        const share = group.available > 0 ? Math.min(1, group.earned / group.available) : 0
        const dim = emphasis !== null && emphasis !== group.key
        return (
          <g key={group.key} className={cn('transition-opacity duration-200', dim && 'opacity-30')}>
            <circle cx={centre} cy={centre} r={r} fill="none" strokeWidth={stroke} className={onTeal ? 'stroke-on-teal-line' : 'stroke-track'} />
            <Tooltip content={<RingTip group={group} />}>
              <circle
                cx={centre}
                cy={centre}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                tabIndex={0}
                aria-label={`${group.label}: ${formatPointsOf(group.earned, group.available)}`}
                className={cn(onTeal ? AREA_STROKE_ON_TEAL[group.key] : AREA_STROKE[group.key], 'cursor-default outline-none transition-[stroke-dashoffset] duration-[800ms] ease-out focus-visible:opacity-80')}
                strokeDasharray={length}
                strokeDashoffset={filled ? length * (1 - share) : length}
              />
            </Tooltip>
          </g>
        )
      })}
    </svg>
  )
}

/** A single small ring with the area's icon in the middle (area tiles, the checklist). */
export function AreaRing({ group, size = 40, className }: { group: ElementGroup; size?: 40 | 20; className?: string }) {
  const filled = useFirstFill(`area-${group.key}-${size}`)
  const stroke = size === 40 ? 3.5 : 2.5
  const r = size / 2 - stroke / 2
  const length = 2 * Math.PI * r
  const share = group.available > 0 ? Math.min(1, group.earned / group.available) : 0
  const Icon = AREA_ICON[group.key]
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(AREA_STROKE[group.key], 'transition-[stroke-dashoffset] duration-[800ms] ease-out')}
          strokeDasharray={length}
          strokeDashoffset={filled ? length * (1 - share) : length}
        />
      </svg>
      {size === 40 ? <Icon className={cn('relative h-4 w-4', AREA_TEXT[group.key])} /> : null}
    </span>
  )
}

function RingTip({ group }: { group: ElementGroup }) {
  return (
    <div className="w-56 space-y-2">
      <p className="text-body font-semibold">{group.label}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-caps">
        <dt className="text-tooltip-muted">Earned</dt>
        <dd className="text-right tabular-nums">{formatPts(group.earned)}</dd>
        <dt className="text-tooltip-muted">Available</dt>
        <dd className="text-right tabular-nums">{formatCeiling(group.available)}</dd>
        <dt className="text-tooltip-muted">Shortfall</dt>
        <dd className="text-right tabular-nums">{formatPts(group.shortfall)}</dd>
      </dl>
      {group.parts.length > 1 ? (
        <ul className="space-y-1 border-t border-tooltip-line pt-2 text-caps">
          {group.parts.map((part) => (
            <li key={part.key} className="flex justify-between gap-3">
              <span>{part.label}</span>
              <span className="tabular-nums text-tooltip-muted">{formatPointsOf(part.earned, part.available)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
