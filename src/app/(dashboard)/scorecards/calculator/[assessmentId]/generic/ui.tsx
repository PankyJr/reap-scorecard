import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import {
  type GenericWorkflowView,
  finalLevelDisplay,
} from '@/lib/scorecard/generic/ux/workflow'
import {
  formatElementPoints as formatElementPointsValue,
  formatPercent as formatPercentValue,
  formatPoints as formatPointsValue,
  formatRand as formatRandValue,
  plainMissingInput,
} from '@/lib/scorecard/generic/ux/display-values'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { PageHeader, type Crumb } from '@/components/ui/PageHeader'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { Panel } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { LevelLadder } from '@/components/ui/LevelLadder'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { stepsFor } from '@/lib/flows'
import { AreaChecklist, BackToAreas, LiveScoreBar, type WorkspaceView } from './workspace'

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
    <div className="space-y-4">
      <PageHeader crumbs={crumbs} title={args.title} description={args.subtitle} />
      <ProgressSteps steps={steps} label="Full scorecard steps" />
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
      <div className="space-y-6 pb-40 lg:pb-0">
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
        <div className="lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          {/* On a phone the list is the overview itself, and an area is full screen. */}
          <aside className={isHub ? 'mb-6 lg:sticky lg:top-6 lg:mb-0' : 'hidden lg:sticky lg:top-6 lg:block'}>
            <AreaChecklist view={args.workspace} />
          </aside>
          <div className="min-w-0 space-y-6">
            {!isHub ? <BackToAreas view={args.workspace} /> : null}
            {args.children}
            <LiveScoreBar view={args.workspace} />
          </div>
        </div>
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
      <div className={showAside ? 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]' : ''}>
        <div className="min-w-0 space-y-6">{args.children}</div>
        {showAside ? <aside className="min-w-0 space-y-4">{args.aside}</aside> : null}
      </div>
      {args.current !== '' ? (
        <div className="border-t border-line pt-4">
          <Link href={`/scorecards/calculator/${args.assessmentId}/generic`} className="text-[15px] font-semibold text-brand hover:underline">
            ← Back to the scorecard overview
          </Link>
        </div>
      ) : null}
    </div>
  )
}

export function Card(args: { title: ReactNode; children: ReactNode; footer?: ReactNode; description?: ReactNode; id?: string }) {
  return (
    <Panel id={args.id} title={args.title} description={args.description} footer={args.footer}>
      <div className="space-y-4">{args.children}</div>
    </Panel>
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
    <Panel id={args.id} title={args.title} description={args.description}>
      <form action={args.action} className="space-y-5">
        {args.children}
        <div className="border-t border-line pt-4">
          <SaveButton label={args.submitLabel} />
        </div>
      </form>
    </Panel>
  )
}

const controlClass =
  'block w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20'

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
      <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
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
      {hint ? <span className="block text-sm text-muted">{hint}</span> : null}
      {args.warning ? <FieldWarning text={args.warning} /> : null}
    </label>
  )
}

/** The amber "is that right?" line under a field. */
export function FieldWarning({ text }: { text: string }) {
  return (
    <span role="note" className="flex items-start gap-1.5 text-sm text-warn">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {text}
    </span>
  )
}

/** Marks a figure that came from the uploaded workbook and has not been changed since. */
export function FromWorkbookTag() {
  return (
    <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">From your workbook</span>
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
      <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
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
      {args.hint ? <span className="block text-sm text-muted">{args.hint}</span> : null}
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
 * The level panel: the B-BBEE level ladder plus points, or what is still
 * needed before there is a level. Shown at the top of the overview and beside
 * the review step, so the outcome is never below the fold.
 */
export function AssessmentAside(args: {
  workflow: GenericWorkflowView
  preview: GenericScorecardCalculation
  stored?: GenericScorecardCalculation | null
}) {
  const showStored =
    args.workflow.hasStoredCalculation && !args.workflow.needsRecalculation && Boolean(args.stored)
  const source = showStored && args.stored ? args.stored : null
  const base = `${args.workflow.continueHref.split('/generic')[0]}/generic`

  if (!showStored || !source) {
    const remaining = args.workflow.remainingCount
    return (
      <div className="space-y-4 rounded-card border border-line bg-surface p-5">
        <div>
          <p className="text-sm text-muted">
            <Term k="level">B-BBEE level</Term>
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink">Not worked out yet</p>
        </div>
        <LevelLadder level={null} size="sm" />
        <p className="text-[15px] text-muted">
          {args.workflow.needsRecalculation && args.workflow.hasStoredCalculation
            ? 'Something changed since the last calculation. Calculate again to update the level.'
            : remaining > 1
              ? `${remaining - 1} item${remaining - 1 === 1 ? '' : 's'} still need${remaining - 1 === 1 ? 's' : ''} attention before you calculate.`
              : 'Everything is in. Calculate to see the level.'}
        </p>
        {args.workflow.checklist.workbookUploaded ? (
          <Link href={`${base}/review`} className={buttonStyles({ variant: 'secondary', className: 'w-full' })}>
            Go to calculate
          </Link>
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
  const isFinal = level.value !== 'Not available'

  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-5">
      <div>
        <p className="text-sm text-muted">{isFinal ? 'B-BBEE level' : 'Points so far'}</p>
        <p className="mt-1 font-serif text-3xl font-semibold text-ink">
          {isFinal ? level.value : `${formatPoints(source.rawTotalPoints)} points`}
        </p>
        {isFinal ? (
          <p className="text-[15px] tabular-nums text-muted">{formatPoints(source.rawTotalPoints)} points in total</p>
        ) : null}
      </div>
      <LevelLadder level={isFinal ? level.value : null} size="sm" />
      {!isFinal ? (
        <p className="text-[15px] text-muted">Some information is still missing, so this is not a final level yet.</p>
      ) : null}
      {source.discountApplied ? (
        <p className="rounded-control bg-warn-soft px-3 py-2 text-sm text-ink">
          Dropped one level because {source.failedPriorityKeys.length}{' '}
          <Term k="subMinimum">priority sub-minimum{source.failedPriorityKeys.length === 1 ? ' was' : 's were'}</Term> missed.
        </p>
      ) : null}
      <Link href={`${base}/result`} className={buttonStyles({ variant: 'secondary', className: 'w-full' })}>
        See the full result
      </Link>
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
  return <AssessmentAside preview={args.preview} workflow={args.workflow} stored={args.stored} />
}

/** The one next thing to do in this scorecard, with how much is left. */
export function NextActionCard(args: { workflow: GenericWorkflowView }) {
  const { workflow } = args
  const done = workflow.completedCount
  const total = workflow.items.length
  if (!workflow.nextAction) {
    return (
      <section className="rounded-card border border-ok/40 bg-ok-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Everything is in place</h2>
        <p className="mt-1 text-[15px] text-ink/80">The scorecard is calculated and up to date.</p>
        <Link href={workflow.continueHref} className={buttonStyles({ variant: 'primary', className: 'mt-4' })}>
          See the result
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-card border border-brand bg-surface p-5 sm:p-6">
      <p className="text-sm text-muted">Next</p>
      <h2 className="mt-0.5 text-xl font-semibold text-ink">{workflow.nextAction.label}</h2>
      <p className="mt-1 text-[15px] text-muted">
        {done} of {total} done
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-brand" style={{ width: `${workflow.percentComplete}%` }} />
      </div>
      <Link href={workflow.nextAction.href} className={buttonStyles({ variant: 'primary', className: 'mt-4' })}>
        Continue
      </Link>
      <details className="mt-4">
        <summary className="cursor-pointer text-[15px] font-semibold text-brand">Show every item</summary>
        <ul className="mt-3 divide-y divide-line rounded-control border border-line">
          {workflow.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[15px]">
              <Link href={item.href} className="text-ink hover:text-brand hover:underline">
                {item.label}
              </Link>
              <span className={item.complete ? 'text-ok' : 'text-warn'}>{item.complete ? 'Done' : 'To do'}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

/** Indicator rows for one element: what was achieved against the target, and the points. */
export function IndicatorTable(args: { element: GenericScorecardCalculation['elements'][number] }) {
  return (
    <div className="relative overflow-x-auto rounded-control border border-line">
      <table className="min-w-full text-left text-[15px]">
        <thead className="bg-sunken text-sm text-muted">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              <Term k="indicator">Indicator</Term>
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Achieved</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Target</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Points</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Bonus</th>
          </tr>
        </thead>
        <tbody>
          {args.element.indicators.map((indicator) => (
            <tr key={indicator.indicatorKey} className="border-t border-line align-top">
              <td className="px-3 py-2.5">
                <p className="font-medium text-ink">{indicator.displayName}</p>
                <p className="mt-1 text-sm text-muted">{indicator.explanation}</p>
              </td>
              <td className="px-3 py-2.5 tabular-nums text-ink">{indicator.actual == null ? '—' : formatPercent(indicator.actual)}</td>
              <td className="px-3 py-2.5 tabular-nums text-ink">{formatPercent(indicator.target)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-ink">
                {formatPoints(indicator.basePointsAchieved)}
                <span className="font-normal text-faint"> / {formatPoints(indicator.basePointsAvailable)}</span>
              </td>
              <td className="px-3 py-2.5 font-semibold tabular-nums text-ink">{formatPoints(indicator.bonusPointsAchieved)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ELEMENT_STATUS_WORDS: Record<string, { label: string; tone: 'ok' | 'warn' | 'neutral' }> = {
  scored: { label: 'Fully scored', tone: 'ok' },
  partial: { label: 'Partly scored: some figures are missing', tone: 'warn' },
  pending_confirmation: { label: 'Waiting for you to confirm the evidence', tone: 'warn' },
  missing_inputs: { label: 'Cannot score yet: figures are missing', tone: 'warn' },
  not_started: { label: 'Not started', tone: 'neutral' },
}

/**
 * Summary first: this element's points, whether it is complete and what is
 * still needed. The indicator-by-indicator working sits underneath, closed,
 * for anyone who wants to check it.
 */
export function ElementScore(args: {
  element: GenericScorecardCalculation['elements'][number]
  title?: string
  /** Where the missing figures are entered on this page. */
  fixHref?: string
}) {
  const { element } = args
  const status = ELEMENT_STATUS_WORDS[element.status] ?? { label: element.status, tone: 'neutral' as const }
  const toneClass = status.tone === 'ok' ? 'text-ok' : status.tone === 'warn' ? 'text-warn' : 'text-muted'
  return (
    <Panel title={args.title ?? 'Points for this area'}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="font-serif text-3xl font-semibold tabular-nums text-ink">
          {formatElementPoints(element.basePointsAchieved, element.basePointsAvailable)}
          <span className="ml-2 font-sans text-base font-normal text-muted">points</span>
        </p>
        {element.bonusPointsAvailable > 0 ? (
          <p className="text-[15px] tabular-nums text-muted">
            plus {formatPoints(element.bonusPointsAchieved)} of {formatPoints(element.bonusPointsAvailable)}{' '}
            <Term k="bonusPoints">bonus points</Term>
          </p>
        ) : null}
      </div>
      <p className={`mt-2 text-[15px] font-semibold ${toneClass}`}>{status.label}</p>
      {element.missingInputs.length > 0 ? (
        <div className="mt-2 text-[15px] text-ink">
          <p>Still needed:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
            {[...new Set(element.missingInputs.map(plainMissingInput))].slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {args.fixHref ? (
            <Link href={args.fixHref} className="mt-2 inline-block font-semibold text-brand hover:underline">
              Enter them below
            </Link>
          ) : null}
        </div>
      ) : null}
      <details className="mt-4 rounded-control border border-line">
        <summary className="cursor-pointer px-4 py-3 text-[15px] font-semibold text-brand">
          How the points are worked out ({element.indicators.length} {element.indicators.length === 1 ? 'line' : 'lines'})
        </summary>
        <div className="border-t border-line p-3">
          <IndicatorTable element={element} />
        </div>
      </details>
    </Panel>
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
