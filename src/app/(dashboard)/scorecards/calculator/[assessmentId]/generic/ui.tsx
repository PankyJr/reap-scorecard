import Link from 'next/link'
import type { ReactNode } from 'react'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import {
  GENERIC_CODES_USER_LABEL,
  type GenericWorkflowView,
  finalLevelDisplay,
} from '@/lib/scorecard/generic/ux/workflow'
import {
  formatPercent as formatPercentValue,
  formatPoints as formatPointsValue,
  formatRand as formatRandValue,
} from '@/lib/scorecard/generic/ux/display-values'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'

export const GENERIC_STEPS = [
  { slug: '', label: 'Overview' },
  { slug: 'applicability', label: 'Applicability' },
  { slug: 'financial', label: 'Financial' },
  { slug: 'ownership', label: 'Ownership' },
  { slug: 'management-control', label: 'Management Control' },
  { slug: 'skills-development', label: 'Skills Development' },
  { slug: 'procurement', label: 'Procurement' },
  { slug: 'enterprise-development', label: 'Enterprise Development' },
  { slug: 'supplier-development', label: 'Supplier Development' },
  { slug: 'socio-economic-development', label: 'Socio-Economic Development' },
  { slug: 'review', label: 'Review' },
  { slug: 'result', label: 'Result' },
] as const

export type GenericStepSlug = (typeof GENERIC_STEPS)[number]['slug']

export function formatRand(value: number | null | undefined): string {
  return formatRandValue(value)
}

export function formatPoints(value: number | null | undefined): string {
  return formatPointsValue(value)
}

export function formatPercent(value: number | null | undefined): string {
  return formatPercentValue(value)
}

export function StepNav(args: {
  assessmentId: string
  current: GenericStepSlug
  companyName: string
  assessmentName: string
  workflow: GenericWorkflowView
}) {
  const { workflow } = args
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/scorecards/calculator/${args.assessmentId}/generic`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Assessment overview
        </Link>
        <p className="text-sm text-slate-500">
          {args.companyName} · {args.assessmentName}
        </p>
      </div>

      {/* Desktop: compact vertical/stepper progress */}
      <nav className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:block">
        <ol className="grid gap-2 lg:grid-cols-5">
          {workflow.stages.map((stage, index) => {
            const active = stage.id === workflow.currentStageId
            const done = index < workflow.currentStageIndex
            return (
              <li key={stage.id}>
                <Link
                  href={stage.href}
                  className={`flex h-full flex-col rounded-xl border px-3 py-3 transition ${
                    active
                      ? 'border-[#063b3f] bg-[#063b3f] text-white'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#063b3f]/30'
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                    Step {index + 1}
                  </span>
                  <span className="mt-1 text-sm font-semibold">{stage.label}</span>
                  <span className={`mt-1 text-xs ${active ? 'text-white/80' : 'text-slate-500'}`}>
                    {stage.description}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Mobile: current stage + overall progress + prev/continue */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current stage</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {workflow.stages[workflow.currentStageIndex]?.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Progress</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{workflow.percentComplete}%</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#063b3f]"
            style={{ width: `${Math.max(8, workflow.percentComplete)}%` }}
          />
        </div>
        <div className="mt-4 flex gap-2">
          {workflow.previousHref ? (
            <Link
              href={workflow.previousHref}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700"
            >
              Previous
            </Link>
          ) : (
            <span className="flex-1 rounded-xl border border-slate-100 px-3 py-2 text-center text-sm text-slate-300">
              Previous
            </span>
          )}
          <Link
            href={workflow.continueHref}
            className="flex-1 rounded-xl bg-[#063b3f] px-3 py-2 text-center text-sm font-semibold text-white"
          >
            Continue
          </Link>
        </div>
      </div>
    </div>
  )
}

export function Shell(args: {
  assessmentId: string
  companyName: string
  assessmentName: string
  current: GenericStepSlug
  title: string
  subtitle?: string
  children: ReactNode
  aside?: ReactNode
  workflow: GenericWorkflowView
}) {
  return (
    <div className="min-h-[70vh] bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <StepNav
          assessmentId={args.assessmentId}
          current={args.current}
          companyName={args.companyName}
          assessmentName={args.assessmentName}
          workflow={args.workflow}
        />
        <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Generic Scorecard Calculator · {GENERIC_CODES_USER_LABEL}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{args.title}</h1>
          {args.subtitle ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{args.subtitle}</p> : null}
        </header>
        <div className={args.aside ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]' : ''}>
          <div className="space-y-6">{args.children}</div>
          {args.aside ? <aside className="space-y-4">{args.aside}</aside> : null}
        </div>
      </div>
    </div>
  )
}

export function Card(args: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-950">{args.title}</h2>
      <div className="mt-4 space-y-4">{args.children}</div>
      {args.footer ? <div className="mt-5 border-t border-slate-100 pt-4">{args.footer}</div> : null}
    </section>
  )
}

/**
 * Form card that keeps the submit button inside the <form>, so the footer
 * SaveButton actually posts the fields above it.
 */
export function FormCard(args: {
  title: ReactNode
  action: (formData: FormData) => void | Promise<void>
  children: ReactNode
  submitLabel?: string
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-950">{args.title}</h2>
      <form action={args.action} className="mt-4 space-y-4">
        {args.children}
        <div className="border-t border-slate-100 pt-4">
          <SaveButton label={args.submitLabel} />
        </div>
      </form>
    </section>
  )
}

export function Field(args: {
  label: string
  name: string
  type?: string
  defaultValue?: string | number | null
  hint?: string
  step?: string
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-800">{args.label}</span>
      <input
        name={args.name}
        type={args.type ?? 'text'}
        step={args.step}
        required={args.required}
        defaultValue={args.defaultValue ?? ''}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#063b3f] focus:outline-none focus:ring-2 focus:ring-[#063b3f]/20"
      />
      {args.hint ? <span className="block text-xs text-slate-500">{args.hint}</span> : null}
    </label>
  )
}

export function SelectField(args: {
  label: string
  name: string
  defaultValue?: string | null
  options: Array<{ value: string; label: string }>
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-800">{args.label}</span>
      <select
        name={args.name}
        defaultValue={args.defaultValue ?? ''}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#063b3f] focus:outline-none focus:ring-2 focus:ring-[#063b3f]/20"
      >
        {args.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {args.hint ? <span className="block text-xs text-slate-500">{args.hint}</span> : null}
    </label>
  )
}

export function SaveButton(args: { label?: string; pendingLabel?: string }) {
  return (
    <PendingSubmitButton
      label={args.label ?? 'Save and continue'}
      pendingLabel={args.pendingLabel ?? 'Saving…'}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0a5257] disabled:cursor-wait disabled:opacity-80"
    />
  )
}

/** Readiness summary until a saved calculation exists; then show stored points/levels. */
export function AssessmentAside(args: {
  workflow: GenericWorkflowView
  preview: GenericScorecardCalculation
  stored?: GenericScorecardCalculation | null
}) {
  const showStored =
    args.workflow.hasStoredCalculation && !args.workflow.needsRecalculation && Boolean(args.stored)
  const source = showStored && args.stored ? args.stored : null
  const checklist = args.workflow.checklist

  if (!showStored || !source) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment readiness</p>
        <p className="text-sm font-semibold text-slate-950">
          {checklist.readyToCalculate
            ? 'Ready to calculate the scorecard'
            : 'Complete the remaining steps before calculating'}
        </p>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex justify-between gap-3">
            <span>Workbook uploaded</span>
            <span className="font-medium">{checklist.workbookUploaded ? 'Yes' : 'No'}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Elements reviewed</span>
            <span className="font-medium">{checklist.elementsReviewed ? 'Yes' : 'No'}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Procurement attached</span>
            <span className="font-medium">{checklist.procurementAttached ? 'Yes' : 'No'}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Required confirmations remaining</span>
            <span className="font-medium">{checklist.requiredConfirmationsRemaining}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Ready to calculate</span>
            <span className="font-medium">{checklist.readyToCalculate ? 'Yes' : 'Not yet'}</span>
          </li>
        </ul>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Final level</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">Not available</p>
          <p className="mt-1 text-xs text-slate-600">
            Complete all required information and calculate the scorecard to generate a final level.
          </p>
        </div>
        {args.workflow.needsRecalculation && args.workflow.hasStoredCalculation ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-900">
            Inputs have changed. Open Review and calculate the scorecard again to update the saved calculation.
          </p>
        ) : null}
      </div>
    )
  }

  const level = finalLevelDisplay({
    hasStoredCalculation: true,
    needsRecalculation: false,
    readinessComplete: source.readiness.complete,
    level: source.finalLevel.level,
  })

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved calculation</p>
      <p className="text-sm font-semibold text-slate-950">{source.headlineMessage}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Base points</dt>
          <dd className="font-semibold text-slate-950">{formatPoints(source.totalBasePointsAchieved)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Bonus points</dt>
          <dd className="font-semibold text-slate-950">{formatPoints(source.totalBonusPointsAchieved)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Raw total</dt>
          <dd className="font-semibold text-slate-950">{formatPoints(source.rawTotalPoints)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Final level</dt>
          <dd className="font-semibold text-slate-950">{level.value}</dd>
        </div>
      </dl>
      {level.supportingMessage ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{level.supportingMessage}</p>
      ) : null}
      {source.discountApplied ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Discounted to {source.finalLevel.level} because {source.failedPriorityKeys.length} priority
          sub-minimum{source.failedPriorityKeys.length === 1 ? '' : 's'} failed.
        </p>
      ) : null}
    </div>
  )
}

/** @deprecated Prefer AssessmentAside — kept as a thin alias during migration. */
export function ResultSummary(args: {
  preview: GenericScorecardCalculation
  needsRecalculation: boolean
  workflow: GenericWorkflowView
  stored?: GenericScorecardCalculation | null
}) {
  return (
    <AssessmentAside
      preview={args.preview}
      workflow={args.workflow}
      stored={args.stored}
    />
  )
}

export function NextActionCard(args: { workflow: GenericWorkflowView }) {
  const { workflow } = args
  if (!workflow.nextAction) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Next action</p>
        <h2 className="mt-1 text-lg font-semibold text-emerald-950">Ready to calculate</h2>
        <p className="mt-2 text-sm text-emerald-900">
          All listed requirements are complete. Open Review and calculate the scorecard.
        </p>
        <Link
          href={workflow.continueHref}
          className="mt-4 inline-flex rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Continue assessment
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[#063b3f]/20 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next action</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-950">{workflow.nextAction.label}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Completed {workflow.completedCount} of {workflow.items.length} · {workflow.remainingCount} remaining ·{' '}
        {workflow.percentComplete}% complete
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#063b3f]" style={{ width: `${workflow.percentComplete}%` }} />
      </div>
      <Link
        href={workflow.nextAction.href}
        className="mt-4 inline-flex rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white"
      >
        Continue assessment
      </Link>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Completed and remaining items</summary>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {workflow.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>{item.label}</span>
              <span className={item.complete ? 'text-emerald-700' : 'text-amber-700'}>
                {item.complete ? 'Done' : 'Remaining'}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

export function IndicatorTable(args: {
  element: GenericScorecardCalculation['elements'][number]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Indicator</th>
            <th className="px-3 py-2 font-semibold">Actual</th>
            <th className="px-3 py-2 font-semibold">Target</th>
            <th className="px-3 py-2 font-semibold">Base</th>
            <th className="px-3 py-2 font-semibold">Bonus</th>
          </tr>
        </thead>
        <tbody>
          {args.element.indicators.map((indicator) => (
            <tr key={indicator.indicatorKey} className="border-t border-slate-100">
              <td className="px-3 py-2">
                <p className="font-medium text-slate-900">{indicator.displayName}</p>
                <p className="mt-1 text-xs text-slate-500">{indicator.explanation}</p>
              </td>
              <td className="px-3 py-2 text-slate-700">
                {indicator.actual == null ? '—' : formatPercent(indicator.actual)}
              </td>
              <td className="px-3 py-2 text-slate-700">{formatPercent(indicator.target)}</td>
              <td className="px-3 py-2 font-semibold text-slate-900">
                {formatPoints(indicator.basePointsAchieved)}
                <span className="text-xs font-normal text-slate-400"> / {formatPoints(indicator.basePointsAvailable)}</span>
              </td>
              <td className="px-3 py-2 font-semibold text-slate-900">
                {formatPoints(indicator.bonusPointsAchieved)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Flash(args: { searchParams: Record<string, string | string[] | undefined> }) {
  const error = typeof args.searchParams.error === 'string' ? args.searchParams.error : null
  const saved = args.searchParams.saved === '1'
  const calculated = args.searchParams.calculated === '1'
  const imported = args.searchParams.imported === '1'
  if (!error && !saved && !calculated && !imported) return null
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        error ? 'border border-rose-200 bg-rose-50 text-rose-950' : 'border border-emerald-200 bg-emerald-50 text-emerald-950'
      }`}
    >
      {error ??
        (imported
          ? 'Workbook import confirmed. Continue with the next required confirmations, then calculate the scorecard.'
          : calculated
            ? 'Scorecard calculation saved.'
            : 'Saved. Calculate the scorecard again before the saved result is updated.')}
    </div>
  )
}
