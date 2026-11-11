import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './cn'

/**
 * Text fields, selects and text areas. Origin UI pattern restyled to tokens:
 * 40px (44px on phones) tall, 1px control border at 3:1 contrast, 10px
 * radius, a teal focus ring, red border + message when invalid.
 */
const control =
  'block w-full min-h-11 rounded-control border border-control-line bg-surface px-3.5 py-2 text-base text-ink shadow-card transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-ink/40 focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-label aria-[invalid=true]:border-bad aria-[invalid=true]:focus:ring-bad/20 sm:min-h-10 sm:text-sm'

export function controlStyles(className?: string): string {
  return cn(control, className)
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={controlStyles(className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={controlStyles(cn('min-h-24 py-2.5 leading-relaxed', className))} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <span className="relative block">
      <select ref={ref} className={controlStyles(cn('appearance-none pr-10', className))} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-label" aria-hidden />
    </span>
  )
})

/** Label above a control, with an optional hint and error under it. */
export function FieldShell(args: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <label className={cn('block space-y-1.5', args.className)}>
      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
        {args.label}
        {args.aside}
      </span>
      {args.children}
      {args.hint ? <span className="block text-sm text-label">{args.hint}</span> : null}
      {args.error ? (
        <span role="alert" className="block text-sm text-bad">
          {args.error}
        </span>
      ) : null}
    </label>
  )
}
