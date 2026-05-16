import * as React from 'react'
import { cn } from '@/components/marketing/cn'

export type MarketingTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const MarketingTextarea = React.forwardRef<HTMLTextAreaElement, MarketingTextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05363A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-none',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
MarketingTextarea.displayName = 'MarketingTextarea'
