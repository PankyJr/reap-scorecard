'use client'

import { deleteProcurementAssessment } from './actions'
import { ConfirmDelete } from '@/components/ui/ConfirmDelete'

interface DeleteProcurementAssessmentButtonProps {
  assessmentId: string
  companyName: string
  assessmentYear: number | null
}

export function DeleteProcurementAssessmentButton({
  assessmentId,
  companyName,
  assessmentYear,
}: DeleteProcurementAssessmentButtonProps) {
  const yearLabel = assessmentYear != null && Number.isFinite(assessmentYear) ? ` ${assessmentYear}` : ''
  return (
    <ConfirmDelete
      triggerLabel="Delete"
      ariaLabel="Delete procurement assessment"
      title={`Delete the${yearLabel} procurement scorecard?`}
      confirmLabel="Delete procurement scorecard"
      onConfirm={() => deleteProcurementAssessment(assessmentId)}
    >
      <p>
        This removes the procurement scorecard for {companyName}, with its suppliers and results. It cannot be undone. A
        full scorecard it was attached to keeps the copy it took, until you attach another.
      </p>
    </ConfirmDelete>
  )
}
