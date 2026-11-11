import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

/**
 * One button look for every <button> and button-shaped <Link>.
 *
 *   primary      solid teal. ONE per screen (design rule 7).
 *   secondary    Untitled UI: white, 1px border, icon + label. Nothing shouts.
 *   ghost        no border until hover; for quiet row actions ("Review").
 *   danger       red text on white: opens a delete confirmation.
 *   destructive  solid red: the final, irreversible confirm only.
 *
 * Every state is styled: hover, focus-visible, pressed (a 1px nudge, transform
 * only), disabled. Heights: sm 32, md 40, lg 44; md and lg reach the 44px
 * touch target on phones.
 */
const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const sizeMap: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm sm:min-h-10',
  lg: 'min-h-11 px-5 text-base',
}

const variantMap: Record<ButtonVariant, string> = {
  primary: 'border border-brand bg-brand text-brand-ink hover:border-brand-hover hover:bg-brand-hover',
  secondary: 'border border-line-strong bg-surface text-ink shadow-card hover:bg-sunken',
  danger: 'border border-line-strong bg-surface text-bad shadow-card hover:border-bad/40 hover:bg-bad-soft',
  /** The final, irreversible confirm (solid red). */
  destructive: 'border border-bad bg-bad text-surface hover:bg-bad/90',
  ghost: 'border border-transparent bg-transparent text-brand hover:bg-brand-soft',
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
