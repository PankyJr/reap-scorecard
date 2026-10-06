'use client'

import { deleteScorecard } from './actions'
import { ConfirmDelete } from '@/components/ui/ConfirmDelete'

interface DeleteScorecardButtonProps {
  scorecardId: string
  companyName: string
  scoreLevel?: string | null
  totalScore?: number | null
}

export function DeleteScorecardButton({ scorecardId, companyName, scoreLevel, totalScore }: DeleteScorecardButtonProps) {
  const summary = [scoreLevel, totalScore != null ? `${Number(totalScore).toFixed(2)} points` : null].filter(Boolean).join(', ')
  return (
    <ConfirmDelete
      triggerLabel="Delete"
      ariaLabel="Delete scorecard"
      title="Delete this hand-entered scorecard?"
      confirmLabel="Delete scorecard"
      onConfirm={() => deleteScorecard(scorecardId)}
    >
      <p>
        This removes the scorecard for {companyName}
        {summary ? ` (${summary})` : ''}. It cannot be undone.
      </p>
    </ConfirmDelete>
  )
}
