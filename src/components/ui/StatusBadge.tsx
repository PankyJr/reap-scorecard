export type BadgeTone = 'ok' | 'warn' | 'bad' | 'neutral' | 'brand'

const toneClass: Record<BadgeTone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-sunken text-muted ring-1 ring-inset ring-line',
  brand: 'bg-brand-soft text-brand',
}

export function StatusBadge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${toneClass[tone]}`}>
      {children}
    </span>
  )
}
