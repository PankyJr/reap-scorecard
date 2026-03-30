'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteScorecard } from './actions'

interface DeleteScorecardButtonProps {
  scorecardId: string
  companyName: string
  scoreLevel?: string | null
  totalScore?: number | null
}

export function DeleteScorecardButton({
  scorecardId,
  companyName,
  scoreLevel,
  totalScore,
}: DeleteScorecardButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await deleteScorecard(scorecardId)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      // Success: server action redirects
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

  const scoreLine =
    scoreLevel || typeof totalScore === 'number'
      ? `(${scoreLevel ?? '—'} • ${typeof totalScore === 'number' ? totalScore.toFixed(2) : '—'})`
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
        aria-label="Delete scorecard"
      >
        <Trash2 className="h-4 w-4" />
        Delete scorecard
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-scorecard-title"
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_rgba(15,23,42,0.12)]">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5">
              <h2
                id="delete-scorecard-title"
                className="text-lg font-semibold text-slate-950"
              >
                Delete scorecard
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                This action is permanent. It will delete the scorecard and all
                saved inputs/results for this scorecard.
              </p>
            </div>

            <div className="px-6 py-5">
              {error && (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              )}

              <p className="text-sm text-slate-700">
                Delete for{' '}
                <strong className="text-slate-900">{companyName}</strong>{' '}
                {scoreLine ? <span className="text-slate-500">{scoreLine}</span> : null}
                ?
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
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

