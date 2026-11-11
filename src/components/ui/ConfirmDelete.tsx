'use client'

import { useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog'

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
    <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="danger" aria-label={args.ariaLabel ?? args.triggerLabel}>
          <Trash2 className="h-4 w-4" aria-hidden />
          {args.triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={args.title}
        dismissible={!loading}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={confirm} loading={loading} loadingLabel="Deleting…">
              {args.confirmLabel}
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-label">{args.children}</div>
        {error ? (
          <p role="alert" className="mt-4 rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
