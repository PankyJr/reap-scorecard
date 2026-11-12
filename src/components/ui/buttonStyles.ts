import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost' | 'plain' | 'onTeal'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

/**
 * Buttons, Halal Lab style: flat, no bevel, no texture.
 *
 *   primary      solid REAP teal, white text. One per screen.
 *   secondary    white, 1px #E3E3E8 border, dark text.
 *   plain        teal text only (also called ghost).
 *   danger       secondary with red text: opens a delete confirmation.
 *   destructive  solid red: the final, irreversible confirm only.
 *
 * Radius 10, 14px medium, 16px icons. 36px tall (44px on phones). Hover
 * darkens or tints; pressed scales to 0.98; focus shows a 3px teal ring.
 */
const base =
  'relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-control text-body font-medium transition-[background-color,border-color,color,transform] duration-200 ease-out [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const sizeMap: Record<ButtonSize, string> = {
  xs: 'h-8 px-2.5 text-meta',
  sm: 'h-11 px-3 sm:h-8',
  md: 'h-11 px-3.5 sm:h-9',
  lg: 'h-11 px-4 sm:h-10',
}

const variantMap: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover',
  secondary: 'border border-control-line bg-surface text-ink hover:border-line-strong hover:bg-sunken',
  danger: 'border border-control-line bg-surface text-bad hover:border-bad/30 hover:bg-bad-soft',
  destructive: 'bg-bad text-surface hover:bg-bad/90',
  ghost: 'text-teal hover:bg-brand-soft',
  plain: 'text-teal hover:bg-brand-soft',
  onTeal: 'border border-control-line bg-surface text-ink hover:bg-sunken',
}

export function buttonStyles({
  variant = 'secondary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}): string {
  return cn(base, sizeMap[size], variantMap[variant], className)
}
