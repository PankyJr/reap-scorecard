'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'

/**
 * Delete button with a confirmation step. Says exactly what will be removed
 * and that it cannot be undone. `onConfirm` returns an error message to show,
 * or nothing when the server action redirected on success.
 */
export function ConfirmDelete(args: {
  triggerLabel: string
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<{ error?: string } | void>
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading])

  const confirm = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await args.onConfirm()
      if (result && result.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch (e) {
      // A server action that redirects throws NEXT_REDIRECT, which is success.
      if (e && typeof e === 'object' && 'digest' in e && String((e as { digest?: unknown }).digest).startsWith('NEXT_REDIRECT')) throw e
      setError('It could not be deleted. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonStyles({ variant: 'danger' })}
        aria-label={args.ariaLabel ?? args.triggerLabel}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {args.triggerLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
          <div className="absolute inset-0 bg-black/40" onClick={() => !loading && setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-card border border-line bg-surface p-6">
            <h2 id="confirm-delete-title" className="text-lg font-semibold text-ink">
              {args.title}
            </h2>
            <div className="mt-2 space-y-2 text-[15px] text-muted">{args.children}</div>
            {error ? <p className="mt-4 rounded-control bg-bad-soft px-3 py-2 text-[15px] text-bad">{error}</p> : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} disabled={loading} className={buttonStyles({ variant: 'secondary' })}>
                Keep it
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={loading}
                className={buttonStyles({ variant: 'primary', className: 'border-bad bg-bad hover:border-bad hover:bg-bad/90' })}
              >
                {loading ? 'Deleting…' : args.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
