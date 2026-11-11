import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost' | 'onTeal'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

/**
 * Texture Button (cult-ui, github.com/nolly-studio/cult-ui
 * registry/default/ui/texture-button.tsx), ported and restyled to REAP.
 *
 * The original stacks two elements: an outer 1px-padded gradient (the bevel)
 * and an inner gradient face. Most of our buttons are <Link>s styled by this
 * one class string, so the same layers are drawn on ONE element: a vertical
 * gradient face, a 1px outer line, a soft white highlight along the inside of
 * the top edge and a faint dark one along the bottom. Pressing sinks it 1px
 * and swaps the highlight for an inner shadow.
 *
 *   primary      REAP teal face. ONE per card at most.
 *   secondary    the white texture variant ("minimal" in cult-ui).
 *   ghost        text only, a tint on hover.
 *   onTeal       white texture on the teal sidebar / hero.
 *   danger       secondary with red text: opens a delete confirmation.
 *   destructive  solid red: the final, irreversible confirm only.
 *
 * Heights 36 (sm) and 40 (md) from tablet up; 44 on phones (touch target).
 * Radius 10, 14px medium, 16px icons, 2px teal focus ring with a 2px offset.
 */
const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const sizeMap: Record<ButtonSize, string> = {
  xs: 'h-8 px-2.5 text-xs',
  sm: 'h-11 px-3 sm:h-9',
  md: 'h-11 px-4 sm:h-10',
  lg: 'h-11 px-5 text-base',
}

const variantMap: Record<ButtonVariant, string> = {
  primary:
    'border border-brand-deep bg-linear-to-b from-brand-hover to-brand text-brand-ink shadow-btn-primary hover:from-brand-hover hover:to-brand-hover active:shadow-btn-primary-pressed active:from-brand active:to-brand',
  secondary:
    'border border-btn-line bg-linear-to-b from-btn-top to-btn-bottom text-ink shadow-btn-secondary hover:border-btn-line-hover hover:to-btn-hover-bottom active:shadow-btn-secondary-pressed active:from-btn-bottom active:to-btn-bottom',
  onTeal:
    'border border-btn-line bg-linear-to-b from-btn-top to-btn-bottom text-brand shadow-btn-secondary hover:to-btn-hover-bottom active:shadow-btn-secondary-pressed active:from-btn-bottom active:to-btn-bottom focus-visible:ring-surface focus-visible:ring-offset-brand',
  danger:
    'border border-btn-line bg-linear-to-b from-btn-top to-btn-bottom text-bad shadow-btn-secondary hover:border-bad/40 hover:to-bad-soft active:shadow-btn-secondary-pressed',
  /** The final, irreversible confirm (solid red). */
  destructive: 'border border-bad bg-bad text-surface shadow-btn-primary hover:bg-bad/90 active:shadow-btn-primary-pressed',
  ghost: 'border border-transparent bg-transparent text-brand hover:bg-brand-soft active:bg-brand-soft',
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
