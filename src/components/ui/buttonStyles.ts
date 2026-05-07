type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'xs' | 'sm' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none'

const sizeMap: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs',
  sm: 'px-4 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
}

const variantMap: Record<ButtonVariant, string> = {
  primary:
    'border border-slate-900 bg-slate-950 text-white shadow-sm hover:bg-slate-800',
  secondary:
    'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50',
  danger:
    'border border-red-200 bg-white text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50',
  ghost:
    'border border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
}

export function buttonStyles({
  variant = 'secondary',
  size = 'sm',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}): string {
  return [base, sizeMap[size], variantMap[variant], className ?? '']
    .filter(Boolean)
    .join(' ')
}

