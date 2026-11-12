import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from './cn'

export type ProgressStep = {
  label: string
  href?: string
  state: 'done' | 'current' | 'todo'
}

/**
 * Where you are in a guided flow (Ilias Miah stepper): small numbered dots on
 * a thin line, labels under them. Done = teal dot with a white tick, current =
 * white dot with a teal ring and teal number, to do = grey ring. The line is
 * teal up to the current step. The same component drives the full scorecard
 * and the procurement-only scorecard, so learning one teaches the other.
 */
export function ProgressSteps({ steps, label, className }: { steps: ProgressStep[]; label?: string; className?: string }) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.state === 'current'),
  )
  const doneCount = steps.filter((s) => s.state === 'done').length
  const current = steps[currentIndex]
  return (
    <nav aria-label={label ?? 'Progress'} className={className}>
      {/* Phones: one line and a bar, so nothing wraps or scrolls sideways. */}
      <div className="sm:hidden">
        <p className="text-meta text-label">
          Step {currentIndex + 1} of {steps.length}: <span className="font-medium text-ink">{current?.label}</span>
          {doneCount > 0 ? ` · ${doneCount} done` : ''}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-track" aria-hidden>
          <div className="h-full rounded-full bg-teal" style={{ width: `${Math.round(((currentIndex + 1) / steps.length) * 100)}%` }} />
        </div>
      </div>
      <ol className="hidden sm:flex">
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          const dot = (
            <span
              className={cn(
                'relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caps font-semibold tabular-nums transition-colors duration-200',
                step.state === 'done' && 'bg-teal text-on-teal',
                step.state === 'current' && 'bg-surface text-teal ring-2 ring-teal',
                step.state === 'todo' && 'bg-surface text-subtle ring-1 ring-control-line',
              )}
            >
              {step.state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> : index + 1}
            </span>
          )
          const linked = Boolean(step.href) && step.state !== 'current'
          const text = (
            <span className={cn('mt-2 block text-meta transition-colors duration-200', step.state === 'current' ? 'font-medium text-ink' : step.state === 'done' ? 'text-ink' : 'text-label', linked && 'group-hover:text-teal')}>
              {step.label}
              <span className="sr-only">{step.state === 'done' ? ' (done)' : step.state === 'current' ? ' (you are here)' : ' (to do)'}</span>
            </span>
          )
          return (
            <li key={step.label} className={cn('relative min-w-0', last ? 'shrink-0' : 'flex-1')} aria-current={step.state === 'current' ? 'step' : undefined}>
              {/* The connector to the next dot: teal once this step is behind you. */}
              {!last ? (
                <span className={cn('absolute left-6 right-0 top-3 h-px', step.state === 'done' ? 'bg-teal' : 'bg-control-line')} aria-hidden />
              ) : null}
              {linked ? (
                <Link href={step.href!} className="group inline-block rounded-sm pr-3 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25">
                  {dot}
                  {text}
                </Link>
              ) : (
                <span className="inline-block pr-3">
                  {dot}
                  {text}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
