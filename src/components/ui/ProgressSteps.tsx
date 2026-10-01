import Link from 'next/link'
import { Check } from 'lucide-react'

export type ProgressStep = {
  label: string
  href?: string
  state: 'done' | 'current' | 'todo'
}

/**
 * Where you are in a guided flow and what is left. The same component drives
 * the full scorecard and the procurement-only scorecard, so learning one
 * teaches the other.
 */
export function ProgressSteps({ steps, label }: { steps: ProgressStep[]; label?: string }) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.state === 'current'),
  )
  const doneCount = steps.filter((s) => s.state === 'done').length
  const current = steps[currentIndex]
  return (
    <nav aria-label={label ?? 'Progress'} className="rounded-card border border-line bg-surface px-4 py-3 sm:px-5">
      <p className="text-sm text-muted sm:hidden">
        Step {currentIndex + 1} of {steps.length}: <span className="font-semibold text-ink">{current?.label}</span>
        {doneCount > 0 ? ` · ${doneCount} done` : ''}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line sm:hidden" aria-hidden>
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(((currentIndex + 1) / steps.length) * 100)}%` }} />
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((step, index) => {
          const body = (
            <span className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  step.state === 'done'
                    ? 'bg-brand text-brand-ink'
                    : step.state === 'current'
                      ? 'bg-surface text-brand ring-2 ring-brand'
                      : 'bg-sunken text-faint ring-1 ring-line'
                }`}
              >
                {step.state === 'done' ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              <span
                className={`text-[15px] ${step.state === 'current' ? 'font-semibold text-ink' : step.state === 'done' ? 'text-ink' : 'text-muted'}`}
              >
                {step.label}
                <span className="sr-only">
                  {step.state === 'done' ? ' (done)' : step.state === 'current' ? ' (you are here)' : ' (to do)'}
                </span>
              </span>
            </span>
          )
          return (
            <li key={step.label} className="flex min-w-0 items-center gap-2" aria-current={step.state === 'current' ? 'step' : undefined}>
              {step.href && step.state !== 'current' ? (
                <Link href={step.href} className="rounded-control px-1 py-0.5 hover:bg-brand-soft">
                  {body}
                </Link>
              ) : (
                <span className="px-1 py-0.5">{body}</span>
              )}
              {index < steps.length - 1 ? <span className="h-px w-6 shrink-0 bg-line-strong lg:w-10" aria-hidden /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
