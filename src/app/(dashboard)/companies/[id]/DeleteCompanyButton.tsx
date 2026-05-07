'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteCompany } from './actions'
import { buttonStyles } from '@/components/ui/buttonStyles'

interface DeleteCompanyButtonProps {
  companyId: string
  companyName: string
}

export function DeleteCompanyButton({ companyId, companyName }: DeleteCompanyButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await deleteCompany(companyId)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      // Success: redirect happens in server action
    } catch {
      setError('Something went wrong.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setOpen(false)
      setError(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonStyles({ variant: 'danger', size: 'sm' })}
        aria-label="Delete company"
      >
        <Trash2 className="h-4 w-4" />
        Delete Company
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-company-title"
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_rgba(15,23,42,0.12)]">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5">
              <h2
                id="delete-company-title"
                className="text-lg font-semibold text-slate-950"
              >
                Delete Company
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                This action cannot be undone. All company data, procurement
                assessments, and legacy scorecards for this company will be
                permanently removed.
              </p>
            </div>
            <div className="px-6 py-5">
              {error && (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              )}
              <p className="text-sm text-slate-700">
                Delete <strong className="text-slate-900">{companyName}</strong>?
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className={buttonStyles({ variant: 'secondary', size: 'md' })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className={buttonStyles({
                    variant: 'primary',
                    size: 'md',
                    className: 'border-red-700 bg-red-700 hover:bg-red-800 hover:border-red-800',
                  })}
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Deleting…
                    </>
                  ) : (
                    'Yes, Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
