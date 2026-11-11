'use client'

import { forwardRef, useEffect, useMemo, useState, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles'
import { cn } from './cn'

export { buttonStyles }
export type { ButtonSize, ButtonVariant }

/**
 * Design rule 2 + 3: a button presses instantly; if the work behind it is
 * still going after 300ms, a spinner appears INSIDE it. The label stays in the
 * layout (invisible) so the button never changes width.
 */
export function useDelayedFlag(on: boolean, delayMs = 300): boolean {
  // A fresh token for each period of "on": the flag is true only once the
  // timer for THIS period has fired, so it never carries over to the next.
  const period = useMemo(() => (on ? {} : null), [on])
  const [fired, setFired] = useState<object | null>(null)
  useEffect(() => {
    if (!period) return
    const timer = window.setTimeout(() => setFired(period), delayMs)
    return () => window.clearTimeout(timer)
  }, [period, delayMs])
  return period !== null && fired === period
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden />
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** The action is running. Disables the button; shows the spinner after 300ms. */
  loading?: boolean
  /** Read to screen readers while loading ("Saving…"). */
  loadingLabel?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, loadingLabel, className, children, disabled, type, ...rest },
  ref,
) {
  const showSpinner = useDelayedFlag(loading)
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...rest}
    >
      <span className={cn('inline-flex items-center gap-2', showSpinner && 'invisible')}>{children}</span>
      {showSpinner ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      ) : null}
      {loading && loadingLabel ? (
        <span className="sr-only" role="status">
          {loadingLabel}
        </span>
      ) : null}
    </button>
  )
})
