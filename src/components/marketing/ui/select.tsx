import * as React from 'react'
import { cn } from '@/components/marketing/cn'

export type MarketingSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const MarketingSelect = React.forwardRef<HTMLSelectElement, MarketingSelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05363A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
MarketingSelect.displayName = 'MarketingSelect'

export function MarketingSelectOption({
  value,
  children,
  disabled,
}: {
  value: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  )
}
