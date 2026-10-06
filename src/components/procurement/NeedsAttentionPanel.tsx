'use client'

import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrencyZar } from '@/lib/procurement/format'
import type { DuplicateGroup, NeedsAttention } from '@/lib/procurement/needsAttention'

/** Rows shown per section before "Show more"; a long list stays light. */
const SECTION_PAGE = 10

const LEVEL_CHOICES: { value: string; label: string }[] = [
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' },
  { value: '5', label: 'Level 5' },
  { value: '6', label: 'Level 6' },
  { value: '7', label: 'Level 7' },
  { value: '8', label: 'Level 8' },
  { value: 'Non-Compliant', label: 'Non-compliant' },
]

export type NeedsAttentionActions = {
  onMarkNonCompliant(rowIds: string[]): void
  onSetLevel(rowId: string, level: string): void
  onMerge(rowIds: string[]): void
  onKeepSeparate(groupKey: string): void
  onRemove(rowIds: string[]): void
  onSetAmount(rowId: string, value: number): void
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function levelLabel(level: string): string {
  return level === 'Non-Compliant' ? 'Non-compliant' : `Level ${level}`
}

function Section(args: {
  id: string
  title: string
  count: number
  explain: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={`${args.id}-title`} className="space-y-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 id={`${args.id}-title`} className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
            {args.title} <StatusBadge tone="warn">{args.count}</StatusBadge>
          </h3>
          <p className="max-w-[70ch] text-[15px] text-muted">{args.explain}</p>
        </div>
        {args.action ? <div className="shrink-0">{args.action}</div> : null}
      </div>
      {args.children}
    </section>
  )
}

/** A list that shows the first rows and grows on request. */
function Growing<T>({ items, render, noun }: { items: T[]; render: (item: T) => ReactNode; noun: string }) {
  const [shown, setShown] = useState(SECTION_PAGE)
  const visible = items.slice(0, shown)
  const left = items.length - visible.length
  return (
    <>
      <ul className="divide-y divide-line rounded-control border border-line">{visible.map(render)}</ul>
      {left > 0 ? (
        <button
          type="button"
          onClick={() => setShown((n) => n + 50)}
          className={buttonStyles({ variant: 'ghost', size: 'sm' })}
        >
          Show {Math.min(50, left)} more of {left} {noun}
        </button>
      ) : null}
    </>
  )
}

function AmountEditor({ rowId, name, value, onSetAmount }: { rowId: string; name: string; value: number; onSetAmount: NeedsAttentionActions['onSetAmount'] }) {
  const [draft, setDraft] = useState(value === 0 ? '' : String(value))
  const commit = () => {
    const n = Number(draft.replace(/[\s,R]/g, ''))
    if (draft.trim() !== '' && Number.isFinite(n) && n !== value) onSetAmount(rowId, n)
  }
  return (
    <span className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`amount-${rowId}`}>
        Spend for {name}
      </label>
      <input
        id={`amount-${rowId}`}
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder="Amount"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        className="w-32 rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-right text-[15px] tabular-nums text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20"
      />
    </span>
  )
}

function duplicateReason(group: DuplicateGroup): string {
  const parts = group.reasons.map((r) => (r === 'name' ? 'the same name' : r === 'vat' ? 'the same VAT number' : 'the same registration number'))
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
}

/**
 * The "Needs attention" list: every problem in the supplier list with a
 * one-click fix. Expired certificates come first because they change the score
 * most and are easiest to miss.
 */
export function NeedsAttentionPanel({
  attention,
  referenceDate,
  totalMeasuredSpend,
  actions,
}: {
  attention: NeedsAttention
  /** The date certificates must still be valid on. */
  referenceDate: string
  totalMeasuredSpend: number
  actions: NeedsAttentionActions
}) {
  if (attention.count === 0) {
    return (
      <div role="status" className="flex gap-3 rounded-control border border-ok/30 bg-ok-soft px-4 py-3 text-[15px] text-ink">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
        <p>
          <strong>Nothing needs attention.</strong> Every supplier has a level, an in-date certificate and a usable amount,
          and none is listed twice.
        </p>
      </div>
    )
  }

  const zeroOrNegative = attention.oddAmounts.filter((item) => item.reason !== 'above_total')
  const aboveTotal = attention.oddAmounts.filter((item) => item.reason === 'above_total')

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 text-[15px] text-ink">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
        <span>
          {attention.count === 1 ? 'One thing needs' : `${attention.count} things need`} your attention. The score below is
          marked <strong>Incomplete</strong> until they are fixed.
        </span>
      </p>

      {attention.expired.length > 0 ? (
        <Section
          id="attention-expired"
          title="Expired certificates"
          count={attention.expired.length}
          explain={
            <>
              These certificates expired before {formatDate(referenceDate)}. An expired certificate scores nothing, so until
              a new one arrives these suppliers count as non-compliant.
            </>
          }
          action={
            <button
              type="button"
              onClick={() => actions.onMarkNonCompliant(attention.expired.map((i) => i.rowId))}
              className={buttonStyles({ variant: 'primary', size: 'sm' })}
            >
              Mark all {attention.expired.length} as non-compliant
            </button>
          }
        >
          <Growing
            items={attention.expired}
            noun="expired certificates"
            render={(item) => (
              <li key={item.rowId} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 text-[15px] text-ink">
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-sm text-muted">
                    {levelLabel(item.level)}, expired {formatDate(item.expiry)} · spend {formatCurrencyZar(item.spend)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => actions.onMarkNonCompliant([item.rowId])}
                  className={buttonStyles({ variant: 'secondary', size: 'xs' })}
                >
                  Mark non-compliant
                </button>
              </li>
            )}
          />
        </Section>
      ) : null}

      {attention.missingLevel.length > 0 ? (
        <Section
          id="attention-level"
          title="No B-BBEE level"
          count={attention.missingLevel.length}
          explain="Without a level a supplier scores nothing. Choose the level from the supplier’s certificate, or mark it non-compliant if it has none."
          action={
            <button
              type="button"
              onClick={() => actions.onMarkNonCompliant(attention.missingLevel.map((i) => i.rowId))}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              Mark all {attention.missingLevel.length} as non-compliant
            </button>
          }
        >
          <Growing
            items={attention.missingLevel}
            noun="suppliers without a level"
            render={(item) => (
              <li key={item.rowId} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 text-[15px] text-ink">
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-sm text-muted">spend {formatCurrencyZar(item.spend)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`level-${item.rowId}`}>
                    B-BBEE level for {item.name}
                  </label>
                  <select
                    id={`level-${item.rowId}`}
                    defaultValue=""
                    onChange={(e) => e.target.value && actions.onSetLevel(item.rowId, e.target.value)}
                    className="rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-[15px] text-ink"
                  >
                    <option value="">Choose the level</option>
                    {LEVEL_CHOICES.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => actions.onMarkNonCompliant([item.rowId])}
                    className={buttonStyles({ variant: 'secondary', size: 'xs' })}
                  >
                    Mark non-compliant
                  </button>
                </span>
              </li>
            )}
          />
        </Section>
      ) : null}

      {attention.duplicates.length > 0 ? (
        <Section
          id="attention-duplicates"
          title="Listed more than once?"
          count={attention.duplicates.length}
          explain="These look like the same supplier. Merge adds their spend together and keeps the first row’s level and ownership. Keep them apart if they really are different suppliers."
        >
          <Growing
            items={attention.duplicates}
            noun="possible duplicates"
            render={(group) => (
              <li key={group.key} className="space-y-2 px-3 py-2.5">
                <p className="text-[15px] text-ink">
                  <span className="font-semibold">{group.names.join(' and ')}</span>
                  <span className="block text-sm text-muted">
                    {duplicateReason(group)} · {formatCurrencyZar(group.totalSpend)} together
                  </span>
                </p>
                {group.levelsDiffer ? (
                  <p className="text-sm text-warn">They have different B-BBEE levels. Check the merged supplier’s level.</p>
                ) : null}
                <span className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => actions.onMerge(group.rowIds)}
                    className={buttonStyles({ variant: 'secondary', size: 'xs' })}
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.onKeepSeparate(group.key)}
                    className={buttonStyles({ variant: 'ghost', size: 'xs' })}
                  >
                    {group.rowIds.length === 2 ? 'Keep both' : `Keep all ${group.rowIds.length}`}
                  </button>
                </span>
              </li>
            )}
          />
        </Section>
      ) : null}

      {zeroOrNegative.length > 0 ? (
        <Section
          id="attention-zero"
          title="Zero or negative amounts"
          count={zeroOrNegative.length}
          explain="A supplier with nothing spent, or a credit, cannot be scored. Enter the amount spent in the year, or remove the row. These must be fixed before saving."
          action={
            <button
              type="button"
              onClick={() => actions.onRemove(zeroOrNegative.map((i) => i.rowId))}
              className={buttonStyles({ variant: 'danger', size: 'sm' })}
            >
              Remove all {zeroOrNegative.length}
            </button>
          }
        >
          <Growing
            items={zeroOrNegative}
            noun="rows"
            render={(item) => (
              <li key={item.rowId} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 text-[15px] text-ink">
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-sm text-muted">{item.reason === 'zero' ? 'No amount' : `Credit of ${formatCurrencyZar(item.value)}`}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <AmountEditor rowId={item.rowId} name={item.name} value={item.value} onSetAmount={actions.onSetAmount} />
                  <button
                    type="button"
                    onClick={() => actions.onRemove([item.rowId])}
                    className={buttonStyles({ variant: 'ghost', size: 'xs', className: 'text-bad hover:bg-bad-soft' })}
                  >
                    Remove
                  </button>
                </span>
              </li>
            )}
          />
        </Section>
      ) : null}

      {aboveTotal.length > 0 ? (
        <Section
          id="attention-above"
          title="More than the total spend"
          count={aboveTotal.length}
          explain={
            <>
              One supplier cannot have more spend than the company’s whole measured procurement spend of{' '}
              {formatCurrencyZar(totalMeasuredSpend)}. The amount may be in cents or include VAT, or the total spend may be
              too low.
            </>
          }
        >
          <Growing
            items={aboveTotal}
            noun="rows"
            render={(item) => (
              <li key={item.rowId} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 text-[15px] text-ink">
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-sm text-muted">{formatCurrencyZar(item.value)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <AmountEditor rowId={item.rowId} name={item.name} value={item.value} onSetAmount={actions.onSetAmount} />
                  <button
                    type="button"
                    onClick={() => actions.onRemove([item.rowId])}
                    className={buttonStyles({ variant: 'ghost', size: 'xs', className: 'text-bad hover:bg-bad-soft' })}
                  >
                    Remove
                  </button>
                </span>
              </li>
            )}
          />
        </Section>
      ) : null}
    </div>
  )
}
