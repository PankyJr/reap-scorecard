import Link from 'next/link'
import { ArrowLeft, FileSpreadsheet, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { type GenericWorkflowView } from '@/lib/scorecard/generic/ux/workflow'
import {
  formatElementPoints as formatElementPointsValue,
  formatPercent as formatPercentValue,
  formatPoints as formatPointsValue,
  formatRand as formatRandValue,
} from '@/lib/scorecard/generic/ux/display-values'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { PageHeader, type Crumb } from '@/components/ui/PageHeader'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { Card } from '@/components/ui/Card'
import { ScoreCard } from '@/components/scorecard/ScoreCard'
import { buildScorecardView } from '@/components/scorecard/scorecard-view'
import { Chip } from '@/components/ui/Chip'
import { Notice } from '@/components/ui/Notice'
import { LevelLadder } from '@/components/ui/LevelLadder'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { stepsFor } from '@/lib/flows'
import { AreaChecklist, BackToAreas, LiveScoreBar, type WorkspaceView } from './workspace'
import { controlStyles } from '@/components/ui/Input'

export const GENERIC_STEPS = [
  { slug: '', label: 'Overview' },
  { slug: 'workbook-review', label: 'Check imported data' },
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

/** "12.57 / 19" — the element subtotal shown on Result section headers. */
export function formatElementPoints(
  achieved: number | null | undefined,
  available: number | null | undefined,
): string {
  return formatElementPointsValue(achieved, available)
}

/**
 * Top of every full-scorecard page: breadcrumbs back to the company and the
 * scorecard overview, the page title, and the same progress steps the
 * procurement scorecard uses.
 */
export function StepNav(args: {
  assessmentId: string
  current: GenericStepSlug
  companyName: string
  companyId?: string
  assessmentName: string
  title: string
  subtitle?: string
  workflow: GenericWorkflowView
}) {
  const base = `/scorecards/calculator/${args.assessmentId}/generic`
  const onHub = args.current === ''
  const crumbs: Crumb[] = [
    { label: 'Companies', href: '/companies' },
    { label: args.companyName, href: args.companyId ? `/companies/${args.companyId}` : '/companies' },
    { label: args.assessmentName, href: onHub ? undefined : base },
  ]
  if (!onHub) crumbs.push({ label: args.title })
  const steps = stepsFor('full', args.workflow.currentStageIndex, {
    1: base,
    2: args.workflow.hasPendingReview ? `${base}/workbook-review` : undefined,
    3: base,
    4: args.workflow.hasStoredCalculation ? `${base}/result` : `${base}/review`,
  }, args.workflow.elementsComplete ? [] : [3])
  return (
    <div className="space-y-6">
      <PageHeader crumbs={crumbs} title={args.title} description={args.subtitle} />
      <ProgressSteps steps={steps} label="Full scorecard steps" className="border-t border-line pt-6" />
    </div>
  )
}

export function Shell(args: {
  assessmentId: string
  companyName: string
  companyId?: string
  assessmentName: string
  current: GenericStepSlug
  title: string
  subtitle?: string
  children: ReactNode
  aside?: ReactNode
  workflow: GenericWorkflowView
  /** The checklist and live score. Pages that pass it get the workspace layout. */
  workspace?: WorkspaceView
}) {
  if (args.workspace) {
    const isHub = args.current === ''
    return (
      <div className="space-y-6 pb-40 lg:-mb-8 lg:pb-0">
        <StepNav
          assessmentId={args.assessmentId}
          current={args.current}
          companyName={args.companyName}
          companyId={args.companyId}
          assessmentName={args.assessmentName}
          title={args.title}
          subtitle={args.subtitle}
          workflow={args.workflow}
        />
        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
          {/* On a phone the list is the overview itself, and an area is full screen. */}
          <aside className={isHub ? 'mb-6 lg:mb-0' : 'hidden lg:block'}>
            <AreaChecklist view={args.workspace} />
          </aside>
          <div className="min-w-0 space-y-6">
            {!isHub ? <BackToAreas view={args.workspace} /> : null}
            {args.children}
          </div>
        </div>
        <LiveScoreBar view={args.workspace} />
      </div>
    )
  }
  const showAside = Boolean(args.aside) && args.current === 'review'
  return (
    <div className="space-y-6">
      <StepNav
        assessmentId={args.assessmentId}
        current={args.current}
        companyName={args.companyName}
        companyId={args.companyId}
        assessmentName={args.assessmentName}
        title={args.title}
        subtitle={args.subtitle}
        workflow={args.workflow}
      />
      {/* The level panel sits beside the review step and on the overview; on
          element pages it only repeated itself, so it is left out there. */}
      <div className={showAside ? 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]' : ''}>
        <div className="min-w-0 space-y-6">{args.children}</div>
        {showAside ? <aside className="min-w-0 space-y-4">{args.aside}</aside> : null}
      </div>
      {args.current !== '' ? (
        <div className="border-t border-line pt-4">
          <Link href={`/scorecards/calculator/${args.assessmentId}/generic`} className={buttonStyles({ variant: 'plain', className: '-ml-2' })}>
            <ArrowLeft aria-hidden /> Back to the scorecard overview
          </Link>
        </div>
      ) : null}
    </div>
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
  description?: ReactNode
  id?: string
}) {
  return (
    <Card id={args.id} title={args.title} description={args.description}>
      <form action={args.action} className="space-y-5">
        {args.children}
        <div className="border-t border-line pt-4">
          <SaveButton label={args.submitLabel} />
        </div>
      </form>
    </Card>
  )
}

const controlClass = controlStyles()

export function Field(args: {
  label: ReactNode
  name: string
  type?: string
  defaultValue?: string | number | null
  hint?: ReactNode
  /** One line on what the figure is. */
  explain?: ReactNode
  /** A typical value, shown as "For example: …". */
  example?: string
  /** The value still matches what the workbook said. */
  fromWorkbook?: boolean
  /** A gentle "is that right?" next to the field; never blocks saving. */
  warning?: string
  step?: string
  required?: boolean
  maxLength?: number
}) {
  const hint =
    args.explain || args.example ? (
      <>
        {args.explain}
        {args.example ? <>{args.explain ? ' ' : ''}For example: {args.example}.</> : null}
        {args.hint ? <span className="mt-0.5 block">{args.hint}</span> : null}
      </>
    ) : (
      args.hint
    )
  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
        {args.label}
        {args.fromWorkbook ? <FromWorkbookTag /> : null}
      </span>
      <input
        name={args.name}
        type={args.type ?? 'text'}
        inputMode={args.type === 'number' ? 'decimal' : undefined}
        step={args.step}
        required={args.required}
        maxLength={args.maxLength}
        defaultValue={args.defaultValue ?? ''}
        className={controlClass}
      />
      {hint ? <span className="block text-meta text-label">{hint}</span> : null}
      {args.warning ? <FieldWarning text={args.warning} /> : null}
    </label>
  )
}

/** The amber "is that right?" line under a field. */
export function FieldWarning({ text }: { text: string }) {
  return (
    <span role="note" className="flex items-start gap-1.5 text-meta text-attention">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {text}
    </span>
  )
}

/** Marks a figure that came from the uploaded workbook and has not been changed since. */
export function FromWorkbookTag() {
  return (
    <Chip tone="neutral" icon={<FileSpreadsheet aria-hidden />}>
      From your workbook
    </Chip>
  )
}

export function SelectField(args: {
  label: ReactNode
  name: string
  defaultValue?: string | null
  options: Array<{ value: string; label: string }>
  hint?: ReactNode
  fromWorkbook?: boolean
  warning?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
        {args.label}
        {args.fromWorkbook ? <FromWorkbookTag /> : null}
      </span>
      <select name={args.name} defaultValue={args.defaultValue ?? ''} className={controlClass}>
        {args.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {args.hint ? <span className="block text-meta text-label">{args.hint}</span> : null}
      {args.warning ? <FieldWarning text={args.warning} /> : null}
    </label>
  )
}

export function SaveButton(args: { label?: string; pendingLabel?: string }) {
  return (
    <PendingSubmitButton
      label={args.label ?? 'Save and continue'}
      pendingLabel={args.pendingLabel ?? 'Saving…'}
      className={buttonStyles({ variant: 'primary' })}
    />
  )
}

/**
 * Beside the review (Brownee + Halal Lab): the compact score card on the
 * figures as they stand, then the level scale as a segmented row with the
 * level highlighted. The score appears only here on the page.
 */
export function AssessmentAside(args: {
  workflow: GenericWorkflowView
  preview: GenericScorecardCalculation
  stored?: GenericScorecardCalculation | null
  company: string
  year?: number | null
  assessmentId: string
}) {
  const view = buildScorecardView(args.preview)
  const saved = args.workflow.hasStoredCalculation && !args.workflow.needsRecalculation && Boolean(args.stored)
  const base = `/scorecards/calculator/${args.assessmentId}/generic`
  return (
    <div className="space-y-4">
      <ScoreCard view={view} company={args.company} year={args.year} compact stacked fillKey={`review-${args.assessmentId}`} />
      <div className="space-y-2">
        <p className="flex items-baseline justify-between gap-2 text-meta text-label">
          <Term k="level">B-BBEE level</Term>
          {saved && args.stored ? <span className="font-medium text-ink">{args.stored.finalLevel.level}</span> : <span>Not worked out yet</span>}
        </p>
        <LevelLadder level={view.level} size="sm" />
        <p className="text-meta text-label">
          {args.workflow.needsRecalculation && args.workflow.hasStoredCalculation
            ? 'Something changed since the last calculation. Calculate again to update the level.'
            : view.isFinal
              ? 'Final on the figures entered.'
              : 'Not final: some information is still missing.'}
        </p>
        {saved ? (
          <Link href={`${base}/result`} className={buttonStyles({ variant: 'plain', className: '-ml-2' })}>
            See the full result
          </Link>
        ) : null}
      </div>
    </div>
  )
}

/** Indicator rows for one element: what was achieved against the target, and the points. */
export function IndicatorTable(args: { element: GenericScorecardCalculation['elements'][number] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-body tabular-nums">
        <thead className="border-b border-line">
          <tr>
            <th scope="col" className="h-10 px-3 text-caps font-medium text-subtle first:pl-0">
              <Term k="indicator">Indicator</Term>
            </th>
            <th scope="col" className="h-10 px-3 text-right text-caps font-medium text-subtle last:pr-0">Achieved</th>
            <th scope="col" className="h-10 px-3 text-right text-caps font-medium text-subtle last:pr-0">Target</th>
            <th scope="col" className="h-10 px-3 text-right text-caps font-medium text-subtle last:pr-0">Points</th>
            <th scope="col" className="h-10 px-3 text-right text-caps font-medium text-subtle last:pr-0">Bonus</th>
          </tr>
        </thead>
        <tbody>
          {args.element.indicators.map((indicator) => (
            <tr key={indicator.indicatorKey} className="border-b border-divider align-top last:border-b-0">
              <td className="py-3 pl-0 pr-3">
                <p className="font-medium text-ink">{indicator.displayName}</p>
                <p className="mt-1 text-meta text-label">{indicator.explanation}</p>
              </td>
              <td className="px-3 py-3 text-right text-ink">{indicator.actual == null ? '—' : formatPercent(indicator.actual)}</td>
              <td className="px-3 py-3 text-right text-ink">{formatPercent(indicator.target)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-ink">
                {formatPoints(indicator.basePointsAchieved)}
                <span className="font-normal text-label"> of {formatPoints(indicator.basePointsAvailable)}</span>
              </td>
              <td className="py-3 pl-3 pr-0 text-right font-medium text-ink">{formatPoints(indicator.bonusPointsAchieved)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type FlashOutcome = { tone: 'success' | 'notice'; message: string }

/**
 * Every outcome a server action can report back to the page it redirects to.
 *
 * An action finishes by redirecting with a flag such as `?deleted=1`. If the
 * flag has no entry here the page simply reloads and the user is left guessing
 * whether anything happened — which is what "saved in silence" looked like.
 * A test reads the flags out of actions.ts and fails if any of them is missing
 * from this table, so a new action cannot quietly reintroduce the gap.
 *
 * Order is priority: the first matching flag wins, so `saved` sits last as the
 * generic fallback.
 */
const FLASH_OUTCOMES: Record<string, Record<string, FlashOutcome>> = {
  evidence: {
    'confirmed': {
      tone: 'success',
      message:
        'Supporting evidence confirmed for that contribution. Calculate the scorecard again before the saved result is updated.',
    },
    'already-confirmed': {
      tone: 'notice',
      message:
        'That contribution already had its supporting evidence confirmed, so nothing was changed. Use "Correct reference" on the row to amend the recorded reference.',
    },
    'corrected': {
      tone: 'success',
      message:
        'Evidence reference corrected. The contribution stays confirmed and the previous reference is kept in the audit trail, so the score is unchanged.',
    },
  },
  imported: {
    '1': {
      tone: 'success',
      message:
        'Workbook import confirmed. Continue with the next required confirmations, then calculate the scorecard.',
    },
  },
  calculated: {
    '1': { tone: 'success', message: 'Scorecard calculation saved.' },
  },
  deleted: {
    '1': {
      tone: 'success',
      message:
        'Contribution deleted. Calculate the scorecard again before the saved result is updated.',
    },
  },
  bonus: {
    '1': {
      tone: 'success',
      message: 'Bonus flags saved. Calculate the scorecard again before the saved result is updated.',
    },
  },
  npat: {
    '1': {
      tone: 'success',
      message: 'Actual NPAT saved. Calculate the scorecard again before the saved result is updated.',
    },
  },
  attached: {
    '1': {
      tone: 'success',
      message:
        'Procurement assessment attached. Calculate the scorecard again before the saved result is updated.',
    },
  },
  detached: {
    '1': {
      tone: 'success',
      message:
        'Procurement assessment detached. Calculate the scorecard again before the saved result is updated.',
    },
  },
  override: {
    '1': {
      tone: 'success',
      message:
        'NPAT denominator override saved. Calculate the scorecard again before the saved result is updated.',
    },
    'cleared': {
      tone: 'success',
      message:
        'NPAT denominator override cleared. Calculate the scorecard again before the saved result is updated.',
    },
  },
  saved: {
    '1': {
      tone: 'success',
      message: 'Saved. Calculate the scorecard again before the saved result is updated.',
    },
  },
}

export function Flash(args: { searchParams: Record<string, string | string[] | undefined> }) {
  const error = typeof args.searchParams.error === 'string' ? args.searchParams.error : null

  let outcome: FlashOutcome | null = null
  for (const [param, values] of Object.entries(FLASH_OUTCOMES)) {
    const raw = args.searchParams[param]
    if (typeof raw !== 'string') continue
    const match = values[raw]
    if (match) {
      outcome = match
      break
    }
  }

  if (!error && !outcome) return null

  if (error) {
    return (
      <Notice tone="bad" title="That did not work">
        {error}
      </Notice>
    )
  }
  return <Notice tone={outcome?.tone === 'notice' ? 'warn' : 'ok'}>{outcome?.message}</Notice>
}
