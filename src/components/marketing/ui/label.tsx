import * as React from 'react'
import { cn } from '@/components/marketing/cn'

export type MarketingLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

export const MarketingLabel = React.forwardRef<HTMLLabelElement, MarketingLabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium leading-none text-slate-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
      {...props}
    />
  ),
)
MarketingLabel.displayName = 'MarketingLabel'
