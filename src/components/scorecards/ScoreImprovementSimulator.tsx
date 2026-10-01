'use client'

import { useMemo, useState } from 'react'
import type { CategoryResult } from '@/lib/scorecard/calculateScorecard'
import { deriveScoreLevel } from '@/lib/scorecard/calculateScorecard'

interface SimulatorProps {
  originalTotal: number
  originalLevel: string
  categories: CategoryResult[]
}

export function ScoreImprovementSimulator({
  originalTotal,
  originalLevel,
  categories,
}: SimulatorProps) {
  const [adjusted, setAdjusted] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c.category_key, c.score])),
  )

  const projected = useMemo(() => {
    let total = 0

    for (const cat of categories) {
      const raw = adjusted[cat.category_key] ?? cat.score
      const clamped = Math.max(0, Math.min(raw, cat.max_score))
      total += clamped
    }

    const projectedTotal = Math.round(total * 100) / 100
    const projectedLevel = deriveScoreLevel(projectedTotal)
    const delta = Math.round((projectedTotal - originalTotal) * 100) / 100

    return {
      projectedTotal,
      projectedLevel,
      delta,
    }
  }, [adjusted, categories, originalTotal])

  return (
    <div className="rounded-2xl border border-line/80 bg-surface p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Improvement Simulator
          </h2>
          <p className="mt-1 text-sm text-muted">
            Model &ldquo;what‑if&rdquo; improvements without changing the saved assessment.
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="text-sm font-medium text-muted">
            Original
          </div>
          <div className="mt-0.5 font-semibold text-ink">
            {originalTotal} pts · {originalLevel}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {categories.map((cat) => {
            const currentValue = adjusted[cat.category_key] ?? cat.score
            const completion =
              cat.max_score > 0 ? (currentValue / cat.max_score) * 100 : 0

            return (
              <div
                key={cat.category_key}
                className="rounded-xl border border-line bg-sunken/50 px-4 py-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">
                    {cat.category_name}
                  </span>
                  <span className="tabular-nums text-muted">
                    {currentValue.toFixed(2)} / {cat.max_score}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={cat.max_score}
                  step={0.5}
                  value={currentValue}
                  onChange={(e) =>
                    setAdjusted((prev) => ({
                      ...prev,
                      [cat.category_key]: Number(e.target.value),
                    }))
                  }
                  className="w-full h-2 accent-slate-800"
                />
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>0</span>
                  <span>{completion.toFixed(0)}% of max</span>
                  <span>{cat.max_score}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-brand text-white p-5 sm:p-6 shadow-lg">
            <p className="text-sm font-medium text-faint">
              Projected Outcome
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {projected.projectedLevel}
            </p>
            <p className="mt-2 text-base text-slate-200">
              {projected.projectedTotal} total points
            </p>
            <p className="mt-2 text-sm text-faint">
              {projected.delta >= 0 ? '+' : ''}
              {projected.delta} pts vs current
            </p>
          </div>

          <div className="rounded-xl border border-line bg-sunken/50 p-4 text-sm leading-relaxed text-muted space-y-2">
            <p>
              This simulator is for planning only. Adjusted values are not saved
              back to the scorecard or database.
            </p>
            <p>
              Use the insights here to agree target scenarios with stakeholders
              before performing a formal re‑assessment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

