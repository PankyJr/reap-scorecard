'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/components/marketing/cn'

type MarketingYearsStatProps = {
  value?: number
  suffix?: string
  label: string
  className?: string
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function MarketingYearsStat({
  value = 20,
  suffix = '+',
  label,
  className,
}: MarketingYearsStatProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible || hasAnimated) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      const id = requestAnimationFrame(() => {
        setDisplayValue(value)
        setHasAnimated(true)
      })
      return () => cancelAnimationFrame(id)
    }

    let completed = false
    const finish = () => {
      if (completed) return
      completed = true
      setHasAnimated(true)
    }
    const durationMs = 1400
    const start = performance.now()
    let frameId = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = easeOutCubic(progress)
      setDisplayValue(Math.round(eased * value))

      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      } else {
        finish()
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frameId)
      finish()
    }
  }, [hasAnimated, isVisible, value])

  return (
    <div
      ref={ref}
      className={cn(
        'border-l-4 border-[#05363A] pl-5 transition-all duration-700 sm:pl-6',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        className,
      )}
    >
      <p
        className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-5xl"
        aria-label={`${value}${suffix} years`}
      >
        <span>{displayValue}</span>
        <span
          className={cn(
            'inline-block transition-all duration-500',
            hasAnimated ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-70',
          )}
        >
          {suffix}
        </span>
      </p>
      <p className="mt-1 text-sm leading-snug text-slate-600">{label}</p>
    </div>
  )
}
