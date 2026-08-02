import Link from 'next/link'
import type { ReactNode } from 'react'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { PARTIAL_RESULT_MESSAGE } from '@/lib/scorecard/generic'

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
  if (value == null || !Number.isFinite(value)) return '—'
  return `R${Math.round(value).toLocaleString('en-ZA')}`
}

export function formatPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(2)
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(2)}%`
}

export function StepNav(args: {
  assessmentId: string
  current: GenericStepSlug
  companyName: string
  assessmentName: string
}) {
  const base = `/scorecards/calculator/${args.assessmentId}/generic`
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/scorecards/calculator/${args.assessmentId}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Modular calculator
        </Link>
        <p className="text-sm text-slate-500">
          {args.companyName} · {args.assessmentName}
        </p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {GENERIC_STEPS.map((step) => {
          const href = step.slug ? `${base}/${step.slug}` : base
          const active = step.slug === args.current
          return (
            <Link
              key={step.slug || 'overview'}
              href={href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-[#063b3f] text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {step.label}
            </Link>
          )
        })}
      </nav>
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
}) {
  return (
    <div className="min-h-[70vh] bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <StepNav
          assessmentId={args.assessmentId}
          current={args.current}
          companyName={args.companyName}
          assessmentName={args.assessmentName}
        />
        <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Generic Scorecard Calculator · generic-codes-2019-v1
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

export function SaveButton(args: { label?: string }) {
  return (
    <button
      type="submit"
      className="rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0a5257]"
    >
      {args.label ?? 'Save and continue'}
    </button>
  )
}

export function ResultSummary(args: { preview: GenericScorecardCalculation; needsRecalculation: boolean }) {
  const { preview } = args
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</p>
      <p className="text-sm font-semibold text-slate-950">{preview.headlineMessage}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Base points</dt>
          <dd className="font-semibold text-slate-950">{formatPoints(preview.totalBasePointsAchieved)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Bonus points</dt>
          <dd className="font-semibold text-slate-950">{formatPoints(preview.totalBonusPointsAchieved)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Raw total</dt>
          <dd className="font-semibold text-slate-950">{formatPoints(preview.rawTotalPoints)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Preliminary level</dt>
          <dd className="font-semibold text-slate-950">{preview.preliminaryLevel.level}</dd>
        </div>
      </dl>
      {preview.discountApplied ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Discounted to {preview.finalLevel.level} because {preview.failedPriorityKeys.length} priority
          sub-minimum{preview.failedPriorityKeys.length === 1 ? '' : 's'} failed.
        </p>
      ) : null}
      {!preview.readiness.complete ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{PARTIAL_RESULT_MESSAGE}</p>
      ) : null}
      {args.needsRecalculation ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-900">
          Inputs have changed. Open Review and run an explicit recalculation to update the stored result.
        </p>
      ) : null}
    </div>
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
          ? 'Workbook import confirmed. Review each element, attach procurement, then run an explicit recalculation.'
          : calculated
            ? 'Calculation run stored.'
            : 'Saved. Recalculation is required before a stored result is updated.')}
    </div>
  )
}
