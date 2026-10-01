/**
 * The B-BBEE level ladder: Level 1 (best) to Level 8, then Non-compliant.
 * The company's rung is filled in; the rest stay pale. This is the one
 * signature element of the product, used wherever a level is shown.
 */

const RUNGS = ['1', '2', '3', '4', '5', '6', '7', '8', 'NC'] as const

const rungColour: Record<(typeof RUNGS)[number], string> = {
  '1': 'bg-level-1 text-white',
  '2': 'bg-level-2 text-white',
  '3': 'bg-level-3 text-white',
  '4': 'bg-level-4 text-white',
  '5': 'bg-level-5 text-white',
  '6': 'bg-level-6 text-ink',
  '7': 'bg-level-7 text-ink',
  '8': 'bg-level-8 text-ink',
  NC: 'bg-level-nc text-ink',
}

/** "Level 4" / "4" / "Non-compliant" -> rung key, or null when not known. */
export function levelRung(level: string | number | null | undefined): (typeof RUNGS)[number] | null {
  if (level == null) return null
  const text = String(level).trim().toLowerCase()
  if (!text) return null
  if (text.includes('non')) return 'NC'
  const match = text.match(/([1-8])/)
  return match ? (match[1] as (typeof RUNGS)[number]) : null
}

export function LevelLadder(args: {
  level: string | number | null | undefined
  /** Shown above the ladder when there is no level yet. */
  pendingLabel?: string
  size?: 'sm' | 'md'
}) {
  const rung = levelRung(args.level)
  const small = args.size === 'sm'
  return (
    <div className="space-y-1.5">
      <ol className="flex gap-1" aria-label={rung ? `B-BBEE level ${rung === 'NC' ? 'Non-compliant' : rung} of 8` : 'B-BBEE level not available yet'}>
        {RUNGS.map((r) => {
          const active = r === rung
          return (
            <li
              key={r}
              aria-current={active ? 'true' : undefined}
              className={`flex flex-1 items-center justify-center rounded-[6px] font-semibold tabular-nums ${small ? 'h-6 text-sm' : 'h-9 text-sm'} ${
                active ? `${rungColour[r]} ring-2 ring-offset-2 ring-brand` : 'bg-sunken text-faint ring-1 ring-inset ring-line'
              }`}
            >
              {r}
            </li>
          )
        })}
      </ol>
      {!small ? (
        <div className="flex justify-between text-[15px] text-faint">
          <span>Level 1 (best)</span>
          <span>Non-compliant</span>
        </div>
      ) : null}
      {!rung && args.pendingLabel ? <p className="text-sm text-muted">{args.pendingLabel}</p> : null}
    </div>
  )
}
