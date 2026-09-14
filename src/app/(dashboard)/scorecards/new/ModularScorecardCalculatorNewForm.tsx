'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createScorecardAssessment } from '../calculator/actions'
import type { ScorecardElementKey } from '@/lib/scorecard/calculator/types'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'

const ELEMENTS: Array<{ key: ScorecardElementKey; name: string; blurb: string }> = [
  {
    key: 'socio_economic_development',
    name: 'Socio-Economic Development (SED)',
    blurb: 'Beneficiary contributions and recognised amounts',
  },
  {
    key: 'enterprise_development',
    name: 'Enterprise Development (ED)',
    blurb: 'Enterprise development contributions',
  },
  {
    key: 'supplier_development',
    name: 'Supplier Development',
    blurb: 'Supplier development (not Skills Development)',
  },
  {
    key: 'management_control',
    name: 'Management Control',
    blurb: 'Board, management and EAP-linked representation',
  },
]

/**
 * Legacy modular calculator creation (selected / single element).
 * Not the primary Generic workbook workflow.
 */
export function ModularScorecardCalculatorNewForm({
  companyId,
  companyName,
  defaultYear,
}: {
  companyId: string
  companyName: string
  defaultYear: number
}) {
  const [scopeMode, setScopeMode] = useState<'full' | 'single' | 'selected'>('single')
  const [selected, setSelected] = useState<ScorecardElementKey[]>(['socio_economic_development'])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  function toggle(key: ScorecardElementKey) {
    setSelected((prev) => {
      if (scopeMode === 'single') return [key]
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      return [...prev, key]
    })
  }

  return (
    <form action={createScorecardAssessment} className="space-y-8">
      <input type="hidden" name="companyId" value={companyId} />

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-950">
        <p className="font-semibold">Modular element workflow</p>
        <p className="mt-1">
          This path uploads Excel per supported modular element. For the full Generic Scorecard workbook,
          use{' '}
          <Link href={`/scorecards/new?companyId=${companyId}`} className="font-semibold underline">
            New Scorecard Calculation
          </Link>
          .
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Company</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{companyName}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Scorecard Assessment for the selected measurement year. You can work on one element only.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Assessment name</span>
            <input
              name="name"
              required
              defaultValue={`${companyName} ${defaultYear} Scorecard`}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-[#063b3f]/20 focus:ring-2"
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
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-[#063b3f]/20 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Status</span>
            <select
              name="status"
              defaultValue="draft"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-[#063b3f]/20 focus:ring-2"
            >
              <option value="draft">Draft</option>
              <option value="final">Final</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-800">Notes</span>
            <textarea
              name="notes"
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-[#063b3f]/20 focus:ring-2"
              placeholder="Optional context for this assessment"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Calculation scope</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">What do you want to calculate?</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ['full', 'All available elements', 'All elements currently supported in this calculator'],
              ['single', 'Single element', 'Upload and calculate only one category'],
              ['selected', 'Selected elements', 'Choose several elements to work on'],
            ] as const
          ).map(([mode, title, desc]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setScopeMode(mode)
                if (mode === 'full') setSelected(ELEMENTS.map((e) => e.key))
                if (mode === 'single') setSelected((prev) => [prev[0] ?? 'socio_economic_development'])
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                scopeMode === mode
                  ? 'border-[#063b3f] bg-[#063b3f] text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold">{title}</p>
              <p className={`mt-1 text-sm leading-6 ${scopeMode === mode ? 'text-white/80' : 'text-slate-500'}`}>
                {desc}
              </p>
            </button>
          ))}
        </div>
        <input type="hidden" name="scopeMode" value={scopeMode} />
      </section>

      {scopeMode !== 'full' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Elements</h3>
          <p className="mt-1 text-sm text-slate-600">
            {scopeMode === 'single'
              ? 'Choose exactly one element. Example: Management Control only.'
              : 'Select one or more elements.'}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ELEMENTS.map((el) => {
              const on = selectedSet.has(el.key)
              return (
                <label
                  key={el.key}
                  className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 ${
                    on ? 'border-[#063b3f]/40 bg-[#063b3f]/5' : 'border-slate-200'
                  }`}
                >
                  <input
                    type={scopeMode === 'single' ? 'radio' : 'checkbox'}
                    name="selectedElements"
                    value={el.key}
                    checked={on}
                    onChange={() => toggle(el.key)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{el.name}</span>
                    <span className="block text-sm text-slate-500">{el.blurb}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </section>
      )}

      {scopeMode === 'full' &&
        ELEMENTS.map((el) => <input key={el.key} type="hidden" name="selectedElements" value={el.key} />)}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
        <p className="max-w-xl text-sm text-slate-500">
          Partial work is supported. A selected-element result is not a complete B-BBEE level.
        </p>
        <PendingSubmitButton
          label="Start Scorecard Assessment"
          pendingLabel="Creating assessment…"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#063b3f] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#052e32] disabled:cursor-wait disabled:opacity-80"
        />
      </div>
    </form>
  )
}
