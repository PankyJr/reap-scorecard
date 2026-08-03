'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

const DEFAULT_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#063b3f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#052e32] disabled:cursor-wait disabled:opacity-80'

/**
 * Submit button that shows a working state and blocks double-clicks while a
 * Server Action (or form post) is in flight.
 */
export function PendingSubmitButton(args: {
  label: string
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={args.className ?? DEFAULT_CLASS}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span>{args.pendingLabel ?? 'Working…'}</span>
        </>
      ) : (
        args.label
      )}
    </button>
  )
}
