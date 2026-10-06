'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ProcurementCategoryKey } from '@/lib/procurement/config'
import { formatCurrencyZar, formatPercentFromRatio, formatPoints } from '@/lib/procurement/format'
import type { ProcurementLineSupplier, ProcurementLineTone } from '@/lib/procurement/scoreSummary'

export type ProcurementScoreLineView = {
  key: ProcurementCategoryKey
  label: string
  isBonus: boolean
  achievedPercent: number
  targetPercent: number
  pointsAchieved: number
  availablePoints: number
  tone: ProcurementLineTone
  progress: number
}

export type ProcurementLineSupplierList = {
  rows: ProcurementLineSupplier[]
  count: number
  total: number
}

const TONE_BAR: Record<ProcurementLineTone, string> = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' }
const TONE_TEXT: Record<ProcurementLineTone, string> = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }
/** Said in words as well as colour, so the state never depends on seeing green or red. */
const TONE_WORDS: Record<ProcurementLineTone, string> = { ok: 'On target', warn: 'Partway', bad: 'Far off' }

function levelLabel(level: string): string {
  if (level === 'Non-Compliant') return 'Non-compliant'
  return /^[1-8]$/.test(level) ? `Level ${level}` : 'No level'
}

function LineBody({ line }: { line: ProcurementScoreLineView }) {
  return (
    <span className="block w-full min-w-0 space-y-2">
      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="min-w-0 text-[15px] font-semibold text-ink">
          {line.label}
          {line.isBonus ? <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-sm font-semibold text-brand">Bonus</span> : null}
        </span>
        <span className="shrink-0 text-[15px] tabular-nums text-ink">
          <strong>{formatPoints(line.pointsAchieved)}</strong>
          <span className="text-muted"> / {formatPoints(line.availablePoints, 0)} points</span>
        </span>
      </span>
      <span className="block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <span className={`block h-full rounded-full ${TONE_BAR[line.tone]}`} style={{ width: `${Math.round(line.progress * 100)}%` }} />
      </span>
      <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>
          Their share <strong className="tabular-nums text-ink">{formatPercentFromRatio(line.achievedPercent, 1)}</strong>
        </span>
        <span>
          Target <strong className="tabular-nums text-ink">{formatPercentFromRatio(line.targetPercent, 0)}</strong>
        </span>
        <span className={`font-semibold ${TONE_TEXT[line.tone]}`}>{TONE_WORDS[line.tone]}</span>
      </span>
    </span>
  )
}

function SupplierList({ id, line, list, hidden }: { id: string; line: ProcurementScoreLineView; list: ProcurementLineSupplierList; hidden: boolean }) {
  if (list.count === 0) {
    return (
      <p id={id} hidden={hidden} className="mt-3 rounded-control bg-sunken px-3 py-2.5 text-[15px] text-muted">
        No supplier counts towards this line yet.
      </p>
    )
  }
  return (
    <div id={id} hidden={hidden} className="mt-3 space-y-2">
      <p className="text-sm text-muted">
        {list.count === list.rows.length
          ? `${list.count} supplier${list.count === 1 ? '' : 's'} count towards this line, largest first.`
          : `The ${list.rows.length} largest of ${list.count} suppliers that count towards this line.`}{' '}
        Together they count as {formatCurrencyZar(list.total)}.
      </p>
      <ol className="divide-y divide-line rounded-control border border-line">
        {list.rows.map((supplier) => (
          <li key={`${line.key}-${supplier.id}`} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="min-w-0 break-words text-[15px] text-ink">{supplier.supplier_name}</span>
            <span className="shrink-0 text-sm tabular-nums text-muted">
              {levelLabel(supplier.level)} · spend {formatCurrencyZar(supplier.value_ex_vat)} · counts{' '}
              <strong className="text-ink">{formatCurrencyZar(supplier.amount)}</strong>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * One row per scoring line: share, target, points and a thin bar. With
 * supplier lists, each row is a button that opens the suppliers counting
 * towards it (keyboard: Tab to the row, Enter or Space to open).
 */
export function ProcurementScoreLines({
  lines,
  suppliersByLine,
}: {
  lines: ProcurementScoreLineView[]
  suppliersByLine?: Partial<Record<ProcurementCategoryKey, ProcurementLineSupplierList>>
}) {
  const baseId = useId()
  const [open, setOpen] = useState<ProcurementCategoryKey | null>(null)

  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => {
        const list = suppliersByLine?.[line.key]
        const panelId = `${baseId}-${line.key}`
        const isOpen = open === line.key
        return (
          <li key={line.key} className="py-3 first:pt-0 last:pb-0">
            {list ? (
              <>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : line.key)}
                  className="flex w-full items-start gap-3 rounded-control p-1 text-left hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30"
                >
                  <LineBody line={line} />
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                <SupplierList id={panelId} line={line} list={list} hidden={!isOpen} />
              </>
            ) : (
              <div className="p-1">
                <LineBody line={line} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
