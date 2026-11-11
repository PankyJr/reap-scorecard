'use client'

import { useEffect, useState } from 'react'

/**
 * Design rule 21: the score counts up once, on the first load of the session
 * (600ms, ease-out), and never again. Motion Primitives' AnimatedNumber
 * pattern, without the animation library: one requestAnimationFrame loop.
 *
 * No layout shift: the final value is always in the layout (invisible) and the
 * moving value sits on top of it. Reduced motion: the final value, at once.
 */
const DURATION = 600

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function CountUp({ value, decimals = 2, onceKey, className }: { value: number; decimals?: number; /** Counted once per browser session per key. */ onceKey: string; className?: string }) {
  const final = value.toFixed(decimals)
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    const storageKey = `reap-countup:${onceKey}`
    let already = false
    try {
      already = window.sessionStorage.getItem(storageKey) === '1'
      window.sessionStorage.setItem(storageKey, '1')
    } catch {
      already = false
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    if (already || reduce || value === 0) {
      frame = requestAnimationFrame(() => setShown(final))
      return () => cancelAnimationFrame(frame)
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      setShown((value * easeOut(t)).toFixed(decimals))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, decimals, final, onceKey])

  return (
    <span className={`relative inline-block tabular-nums ${className ?? ''}`}>
      <span className="invisible" aria-hidden>
        {final}
      </span>
      <span className="absolute inset-0 text-left" aria-hidden>
        {shown ?? ''}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  )
}
