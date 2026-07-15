'use client'

import { ArrowLeft, ArrowRight, Check, MousePointerClick, X } from 'lucide-react'
import type { TourPlacement } from '@/components/tour/guides/types'
import { arrowOffset, type Rect } from '@/components/tour/tourGeometry'

export function TourStepCard({
  title,
  body,
  hint,
  phase,
  guideTitle,
  stepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  isWelcome,
  isActionStep,
  placement,
  targetRect,
  position,
  onNext,
  onBack,
  onSkip,
  onMeasure,
}: {
  title: string
  body: string
  hint?: string
  phase?: string
  guideTitle: string
  stepIndex: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  isWelcome: boolean
  isActionStep: boolean
  placement: TourPlacement
  targetRect: Rect | null
  position: { top: number; left: number }
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  onMeasure: (height: number) => void
}) {
  const progress = ((stepIndex + 1) / totalSteps) * 100
  const arrowLeft = arrowOffset(targetRect, position.top, position.left, placement)

  return (
    <div
      ref={(node) => {
        if (node) onMeasure(node.offsetHeight)
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
      aria-describedby="guided-tour-body"
      className="tour-card-enter absolute z-[102] w-[min(400px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(15,23,42,0.04)]"
      style={{ top: position.top, left: position.left }}
      onClick={(event) => event.stopPropagation()}
    >
      {arrowLeft != null && (placement === 'top' || placement === 'bottom') ? (
        <span
          aria-hidden
          className={[
            'pointer-events-none absolute h-3 w-3 rotate-45 border border-slate-200/90 bg-white',
            placement === 'bottom' ? '-top-1.5' : '-bottom-1.5',
          ].join(' ')}
          style={{ left: arrowLeft - 6 }}
        />
      ) : null}

      <div
        className={[
          'relative overflow-hidden px-5 pb-4 pt-5 sm:px-6',
          isWelcome ? 'bg-[#063b3f] text-white' : 'border-b border-slate-100 bg-slate-50/60',
        ].join(' ')}
      >
        {isWelcome ? (
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(255,255,255,0.08),transparent_55%)]"
            aria-hidden
          />
        ) : null}

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={[
                'text-[10px] font-semibold uppercase tracking-[0.2em]',
                isWelcome ? 'text-emerald-200/80' : 'text-[#063b3f]/70',
              ].join(' ')}
            >
              {guideTitle}
            </p>
            {phase ? (
              <p
                className={[
                  'mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em]',
                  isWelcome ? 'text-white/45' : 'text-slate-400',
                ].join(' ')}
              >
                {phase}
              </p>
            ) : null}
            <p
              className={[
                'mt-1 text-[11px] font-medium tabular-nums',
                isWelcome ? 'text-white/55' : 'text-slate-400',
              ].join(' ')}
            >
              Step {stepIndex + 1} of {totalSteps}
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className={[
              'shrink-0 rounded-lg p-1.5 transition',
              isWelcome
                ? 'text-white/50 hover:bg-white/10 hover:text-white/80'
                : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-600',
            ].join(' ')}
            aria-label="Close guide"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-black/10">
          <div
            className={[
              'h-full rounded-full transition-all duration-500 ease-out',
              isWelcome ? 'bg-emerald-300/90' : 'bg-[#063b3f]',
            ].join(' ')}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <h2
          id="guided-tour-title"
          className="text-[1.125rem] font-semibold leading-snug tracking-tight text-slate-950 sm:text-xl"
        >
          {title}
        </h2>
        <p id="guided-tour-body" className="mt-2.5 text-sm leading-relaxed text-slate-600">
          {body}
        </p>

        {isActionStep ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-3">
            <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
            <p className="text-[13px] font-medium leading-relaxed text-amber-900">
              {hint ?? 'Click the highlighted button to continue.'}
            </p>
          </div>
        ) : hint ? (
          <div className="mt-4 rounded-xl border border-[#063b3f]/15 bg-[#063b3f]/[0.04] px-3.5 py-3">
            <p className="text-[13px] leading-relaxed text-[#042f34]">{hint}</p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            Skip guide
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isFirstStep}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back
            </button>
            {!isActionStep ? (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#05363A] bg-[#063b3f] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#075258]"
              >
                {isLastStep ? (
                  <>
                    Done
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
