'use client'

import { useEffect, useState } from 'react'
import { formatDate, timeAgo } from './format'

/**
 * Design rule 22: "Updated 2 min ago" on every data section. Re-reads the
 * clock every minute; the full date is on hover (rule 15).
 */
export function RelativeTime({ value, prefix = 'Updated', className }: { value: string | null | undefined; prefix?: string; className?: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  if (!value) return null
  return (
    <time dateTime={value} title={formatDate(value)} className={className} suppressHydrationWarning>
      {prefix ? `${prefix} ` : ''}
      {timeAgo(value, now)}
    </time>
  )
}
