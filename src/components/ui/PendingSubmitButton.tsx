'use client'

import { useFormStatus } from 'react-dom'
import { Button } from './Button'
import type { ButtonVariant } from './buttonStyles'

/**
 * Submit button for a Server Action form. Blocks double-clicks while the post
 * is in flight; after 300ms a spinner replaces the label in place, same width.
 */
export function PendingSubmitButton(args: {
  label: string
  pendingLabel?: string
  className?: string
  variant?: ButtonVariant
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant={args.variant ?? 'primary'}
      loading={pending}
      loadingLabel={args.pendingLabel ?? 'Working…'}
      className={args.className}
    >
      {args.label}
    </Button>
  )
}
