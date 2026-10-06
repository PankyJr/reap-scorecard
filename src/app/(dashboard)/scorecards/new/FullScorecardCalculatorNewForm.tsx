'use client'

import { createGenericScorecardAssessment } from '../calculator/actions'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { Term } from '@/components/ui/Term'

const fieldClassName =
  'mt-2 block w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20'

/**
 * Step 1 of the full scorecard: name it and pick the year. Everything else
 * comes from the workbook on the next step. New assessments always start as
 * drafts, so there is nothing to choose about status.
 */
export function FullScorecardCalculatorNewForm({
  companyId,
  companyName,
  defaultYear,
  prefillNote,
}: {
  companyId: string
  companyName: string
  defaultYear: number
  /** Where the pre-filled company figures come from, said plainly. */
  prefillNote?: string | null
}) {
  return (
    <form action={createGenericScorecardAssessment} className="space-y-6">
      <input type="hidden" name="companyId" value={companyId} />

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="block">
          <span className="text-[15px] font-semibold text-ink">Name</span>
          <span className="block text-sm text-muted">How this scorecard is listed. You can keep the suggestion.</span>
          <input
            name="name"
            required
            autoComplete="off"
            defaultValue={`${companyName} ${defaultYear} B-BBEE scorecard`}
            className={fieldClassName}
          />
        </label>
        <label className="block">
          <span className="text-[15px] font-semibold text-ink">Year</span>
          <span className="block text-sm text-muted">
            The financial year being <Term k="measurementPeriod">measured</Term>, by the year it ends.
          </span>
          <input
            name="measurementYear"
            type="number"
            inputMode="numeric"
            required
            defaultValue={defaultYear}
            min={2000}
            max={2100}
            className={fieldClassName}
          />
        </label>
      </div>

      <details className="rounded-control border border-line bg-sunken">
        <summary className="cursor-pointer px-4 py-3 text-[15px] font-semibold text-brand">Add a note (optional)</summary>
        <div className="border-t border-line px-4 py-4">
          <label className="block">
            <span className="sr-only">Notes</span>
            <textarea name="notes" rows={2} className={fieldClassName} placeholder="Anything the team should know about this scorecard" />
          </label>
        </div>
      </details>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px] text-muted">
          Next: upload the company’s scorecard workbook, or fill in each area by hand.
          {prefillNote ? <span className="mt-1 block">{prefillNote}</span> : null}
        </p>
        <PendingSubmitButton
          label="Create the scorecard"
          pendingLabel="Creating the scorecard…"
          className={buttonStyles({ variant: 'primary', size: 'lg' })}
        />
      </div>
    </form>
  )
}
