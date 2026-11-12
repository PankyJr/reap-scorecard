/**
 * The B-BBEE level ladder: Level 1 (best) to Level 8, then Non-compliant.
 * The company's rung is filled in; the rest stay pale. This is the one
 * signature element of the product, used wherever a level is shown.
 */

const RUNGS = ['1', '2', '3', '4', '5', '6', '7', '8', 'NC'] as const

/** "Level 4" / "4" / "Non-compliant" -> rung key, or null when not known. */
export function levelRung(level: string | number | null | undefined): (typeof RUNGS)[number] | null {
  if (level == null) return null
  const text = String(level).trim().toLowerCase()
  if (!text) return null
  if (text.includes('non')) return 'NC'
  const match = text.match(/([1-8])/)
  return match ? (match[1] as (typeof RUNGS)[number]) : null
}

/**
 * The scale as a segmented row (Halal Lab segmented control): a grey track,
 * 1 to 8 then NC, the company's level a white raised pill in teal.
 */
export function LevelLadder(args: {
  level: string | number | null | undefined
  /** Shown under the scale when there is no level yet. */
  pendingLabel?: string
  size?: 'sm' | 'md'
}) {
  const rung = levelRung(args.level)
  const small = args.size === 'sm'
  return (
    <div className="space-y-1.5">
      <ol className="flex gap-0.5 rounded-control bg-segment p-0.5" aria-label={rung ? `B-BBEE level ${rung === 'NC' ? 'Non-compliant' : rung} of 8` : 'B-BBEE level not available yet'}>
        {RUNGS.map((r) => {
          const active = r === rung
          return (
            <li
              key={r}
              aria-current={active ? 'true' : undefined}
              className={`flex flex-1 items-center justify-center rounded-[8px] text-caps font-medium tabular-nums transition-colors duration-200 ${small ? 'h-7' : 'h-8'} ${
                active ? 'bg-surface font-semibold text-teal shadow-pill' : 'text-label'
              }`}
            >
              {r}
            </li>
          )
        })}
      </ol>
      {!small ? (
        <div className="flex justify-between text-caps text-label">
          <span>Level 1 (best)</span>
          <span>Non-compliant</span>
        </div>
      ) : null}
      {!rung && args.pendingLabel ? <p className="text-meta text-label">{args.pendingLabel}</p> : null}
    </div>
  )
}
