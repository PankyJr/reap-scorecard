'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from './cn'

/**
 * First load only: the section fades up 8px, 200ms ease-out, 40ms after the
 * one before it. Never again for that page while this tab stays open, so going
 * back to a page shows it at once. Reduced motion: no movement (globals.css).
 *
 * Remembered in memory, not storage: a full reload is a new first load.
 */
const shown = new Set<string>()

export function Reveal({ index, children, className, as: Tag = 'div' }: { index: number; children: ReactNode; className?: string; as?: 'div' | 'section' }) {
  const path = usePathname() ?? ''
  // Decided once, at mount: the server render and the first visit animate.
  const [animate] = useState(() => !shown.has(path))
  useEffect(() => {
    shown.add(path)
  }, [path])
  return (
    <Tag className={cn(animate && 'reap-reveal', className)} style={animate ? ({ '--reveal-delay': `${index * 40}ms` } as CSSProperties) : undefined}>
      {children}
    </Tag>
  )
}
