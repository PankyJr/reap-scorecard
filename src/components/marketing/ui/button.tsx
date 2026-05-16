import * as React from 'react'
import { cn } from '@/components/marketing/cn'

export type MarketingButtonVariant = 'default' | 'outline' | 'destructive' | 'orange' | 'green'
export type MarketingButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export type MarketingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  variant?: MarketingButtonVariant
  size?: MarketingButtonSize
}

const variantClass: Record<MarketingButtonVariant, string> = {
  default:
    'bg-orange-500 text-white hover:bg-orange-600 border-orange-500 border',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 border-red-600 border',
  outline:
    'border border-slate-300 bg-white hover:bg-slate-50 text-slate-900',
  orange: 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500 border',
  green: 'bg-green-500 text-white hover:bg-green-600 border-green-500 border',
}

const sizeClass: Record<MarketingButtonSize, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-12 px-7 text-base',
  icon: 'h-10 w-10 p-0',
}

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

export function MarketingButton({
  className,
  variant = 'default',
  size = 'default',
  asChild,
  children,
  ...props
}: MarketingButtonProps) {
  const classes = cn(base, variantClass[variant], sizeClass[size], className)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(classes, (children.props as { className?: string }).className),
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
