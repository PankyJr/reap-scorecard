type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 disabled:opacity-60 disabled:pointer-events-none'

const sizeMap: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-sm',
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-4 py-2.5 text-[15px]',
  lg: 'px-5 py-3 text-base',
}

const variantMap: Record<ButtonVariant, string> = {
  primary: 'border border-brand bg-brand text-brand-ink hover:bg-brand-hover hover:border-brand-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-brand hover:text-brand',
  danger: 'border border-bad/40 bg-surface text-bad hover:bg-bad-soft',
  /** The final, irreversible confirm (solid red). */
  destructive: 'border border-bad bg-bad text-white hover:bg-bad/90',
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
  return [base, sizeMap[size], variantMap[variant], className ?? ''].filter(Boolean).join(' ')
}
