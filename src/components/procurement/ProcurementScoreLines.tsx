'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { cn } from '@/components/ui/cn'
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

/** Bars in teal / amber / red; the words say the same in a capsule. */
const TONE_BAR: Record<ProcurementLineTone, string> = { ok: 'bg-teal', warn: 'bg-el-skills', bad: 'bg-danger' }
const TONE_CHIP: Record<ProcurementLineTone, ChipTone> = { ok: 'success', warn: 'attention', bad: 'danger' }
/** Said in words as well as colour, so the state never depends on seeing green or red. */
const TONE_WORDS: Record<ProcurementLineTone, string> = { ok: 'On target', warn: 'Partway', bad: 'Far off' }

function levelLabel(level: string): string {
  if (level === 'Non-Compliant') return 'Non-compliant'
  return /^[1-8]$/.test(level) ? `Level ${level}` : 'No level'
}

function LineBody({ line }: { line: ProcurementScoreLineView }) {
  return (
    <span className="block w-full min-w-0">
      <span className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
            {line.label}
            {line.isBonus ? <Chip tone="progress">Bonus</Chip> : null}
            <Chip tone={TONE_CHIP[line.tone]}>{TONE_WORDS[line.tone]}</Chip>
          </span>
          <span className="mt-0.5 block text-meta tabular-nums text-label">
            Their share {formatPercentFromRatio(line.achievedPercent, 1)} · Target {formatPercentFromRatio(line.targetPercent, 0)}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap text-body tabular-nums">
          <span className="font-medium text-ink">{formatPoints(line.pointsAchieved)}</span>
          <span className="text-label"> of {formatPoints(line.availablePoints, 0)}</span>
        </span>
      </span>
      <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-track" aria-hidden>
        <span className={cn('block h-full rounded-full opacity-[0.85]', TONE_BAR[line.tone])} style={{ width: `${Math.round(line.progress * 100)}%` }} />
      </span>
    </span>
  )
}

function SupplierList({ id, line, list, hidden }: { id: string; line: ProcurementScoreLineView; list: ProcurementLineSupplierList; hidden: boolean }) {
  if (list.count === 0) {
    return (
      <p id={id} hidden={hidden} className="mt-3 rounded-control bg-sunken px-3 py-2.5 text-meta text-label">
        No supplier counts towards this indicator yet.
      </p>
    )
  }
  return (
    <div id={id} hidden={hidden} className="mt-3 space-y-2">
      <p className="text-meta text-label">
        {list.count === list.rows.length
          ? `${list.count} supplier${list.count === 1 ? '' : 's'} count towards this indicator, largest spend first.`
          : `The ${list.rows.length} largest of ${list.count} suppliers that count towards this indicator.`}{' '}
        Together they count as {formatCurrencyZar(list.total)}.
      </p>
      <ol className="divide-y divide-divider border-y border-line">
        {list.rows.map((supplier) => (
          <li key={`${line.key}-${supplier.id}`} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="min-w-0 break-words text-body text-ink">{supplier.supplier_name}</span>
            <span className="shrink-0 text-meta tabular-nums text-label">
              {levelLabel(supplier.level)} · spend {formatCurrencyZar(supplier.value_ex_vat)} · counts{' '}
              <span className="font-medium text-ink">{formatCurrencyZar(supplier.amount)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * One row per indicator: share, target, points and a thin bar. With
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
    <ul className="divide-y divide-divider border-y border-line">
      {lines.map((line) => {
        const list = suppliersByLine?.[line.key]
        const panelId = `${baseId}-${line.key}`
        const isOpen = open === line.key
        return (
          <li key={line.key}>
            {list ? (
              <>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : line.key)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-[10px] px-2 py-4 text-left transition-colors duration-200 hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
                >
                  <LineBody line={line} />
                  <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-icon transition-transform duration-200', isOpen && 'rotate-180')} aria-hidden />
                </button>
                <div className={isOpen ? 'pb-4' : undefined}>
                  <SupplierList id={panelId} line={line} list={list} hidden={!isOpen} />
                </div>
              </>
            ) : (
              <div className="py-4">
                <LineBody line={line} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
