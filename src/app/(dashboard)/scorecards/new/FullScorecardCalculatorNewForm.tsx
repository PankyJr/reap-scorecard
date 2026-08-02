'use client'

import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { createGenericScorecardAssessment } from '../calculator/actions'

const fieldClassName =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none ring-[#063b3f]/20 placeholder:text-slate-400 focus:border-[#063b3f]/40 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[#063b3f] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#052e32] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? 'Creating assessment…' : 'Create Assessment and Upload Workbook'}
    </button>
  )
}

export function FullScorecardCalculatorNewForm({
  companyId,
  companyName,
  defaultYear,
}: {
  companyId: string
  companyName: string
  defaultYear: number
}) {
  return (
    <form action={createGenericScorecardAssessment} className="space-y-8">
      <input type="hidden" name="companyId" value={companyId} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Company</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{companyName}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a Generic Scorecard Assessment, upload the REAP Generic Scorecard workbook, review the
          detected data and calculate the scorecard.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Assessment name</span>
            <input
              name="name"
              required
              autoComplete="off"
              defaultValue={`${companyName} ${defaultYear} Generic Scorecard`}
              className={fieldClassName}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Measurement year</span>
            <input
              name="measurementYear"
              type="number"
              required
              defaultValue={defaultYear}
              min={2000}
              max={2100}
              className={fieldClassName}
            />
          </label>
          <div className="block text-sm">
            <span className="font-medium text-slate-800">Status</span>
            <p className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              Draft
            </p>
            <p className="mt-1 text-xs text-slate-500">Status is fixed to Draft when the assessment is created.</p>
          </div>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-800">Notes</span>
            <textarea
              name="notes"
              rows={2}
              className={fieldClassName}
              placeholder="Optional context for this assessment"
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
        <p className="max-w-xl text-sm text-slate-500">
          Next step: upload the full Generic Scorecard workbook and review detected sheets before import.{' '}
          <Link
            href={`/scorecards/new?companyId=${companyId}&mode=modular`}
            className="font-medium text-slate-700 underline"
          >
            Work with selected elements instead
          </Link>
        </p>
        <SubmitButton />
      </div>
    </form>
  )
}
