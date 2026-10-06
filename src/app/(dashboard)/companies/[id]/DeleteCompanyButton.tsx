'use client'

import { deleteCompany } from './actions'
import { ConfirmDelete } from '@/components/ui/ConfirmDelete'

export function DeleteCompanyButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  return (
    <ConfirmDelete
      triggerLabel="Delete company"
      ariaLabel="Delete company"
      title={`Delete ${companyName}?`}
      confirmLabel="Delete company"
      onConfirm={() => deleteCompany(companyId)}
    >
      <p>This removes the company and all of its full scorecards and procurement scorecards. It cannot be undone.</p>
    </ConfirmDelete>
  )
}
