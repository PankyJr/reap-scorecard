import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import {
  EAP_POPULATION_KEYS,
  EAP_POPULATION_LABELS,
  eapShareFieldName,
  formatPercent,
  hasOnlyLegacyBandRows,
  sharesFromRows,
  validateEapShares,
} from '@/lib/scorecard/calculator/eap/population-shares'
import { activateEapTargetSet, duplicateEapTargetSet, saveEapTargetValues } from '../actions'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string; activated?: string }>
}

export default async function EapTargetSetDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  await requireReapInternalAdmin({ loginNext: `/settings/eap-targets/${id}` })
  const q = await searchParams
  const admin = createServiceRoleSupabase()

  const { data: set } = await admin.from('eap_target_sets').select('*').eq('id', id).maybeSingle()
  if (!set) notFound()

  const { data: values } = await admin
    .from('eap_target_set_values')
    .select('*')
    .eq('target_set_id', id)

  const { data: audit } = await admin
    .from('eap_target_set_audit')
    .select('*')
    .eq('target_set_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const rows = values ?? []
  const shares = sharesFromRows(rows)
  const legacyOnly = hasOnlyLegacyBandRows(rows)
  const complete = validateEapShares(shares).ok
  const total = EAP_POPULATION_KEYS.reduce((sum, key) => sum + (shares[key] ?? 0), 0)
  const readOnly = set.status === 'retired'

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link href="/settings/eap-targets" className="text-sm font-medium text-muted">
        ← EAP target sets
      </Link>

      <header>
        <h1 className="text-3xl font-semibold text-ink">{set.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Year {set.year} · v{set.version} · <span className="capitalize">{set.status}</span>
          {set.geography ? ` · ${set.geography}` : ''}
        </p>
      </header>

      {q.error && (
        <div className="rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">{q.error}</div>
      )}
      {(q.saved || q.activated) && (
        <div className="rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-sm text-ok">
          {q.activated ? 'Target set activated.' : 'Values saved.'}
        </div>
      )}

      {legacyOnly && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          This set was saved in an older format (black people and black women per management level) that the
          scorecard cannot use. Enter the six population shares below and save.
        </div>
      )}

      <form action={saveEapTargetValues} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
        <input type="hidden" name="targetSetId" value={id} />
        <h2 className="text-base font-semibold text-ink">Population shares</h2>
        <p className="text-sm text-muted">
          Enter each group&apos;s share of the economically active population, as a percentage. Use the figures
          published by the Commission for Employment Equity for {set.year}. The other groups make up the rest, so
          these six add up to less than 100%.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {EAP_POPULATION_KEYS.map((key) => {
            const field = eapShareFieldName(key)
            const stored = shares[key]
            return (
              <label key={key} htmlFor={field} className="block text-sm">
                <span className="font-medium text-ink">{EAP_POPULATION_LABELS[key]}</span>
                <span className="mt-1 flex items-center gap-2">
                  <input
                    id={field}
                    name={field}
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min={0}
                    max={100}
                    required
                    defaultValue={stored == null ? '' : Number((stored * 100).toFixed(4))}
                    className="w-32 rounded-lg border border-line-strong px-3 py-2"
                    disabled={readOnly}
                  />
                  <span className="text-muted">%</span>
                </span>
              </label>
            )
          })}
        </div>
        <p className="text-sm text-muted">
          {complete ? `Saved total: ${formatPercent(total)}.` : 'Not all six shares have been saved yet.'}
        </p>
        {!readOnly && (
          <button type="submit" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">
            Save shares
          </button>
        )}
      </form>

      <div className="flex flex-wrap gap-3">
        {set.status === 'draft' && (
          <form action={activateEapTargetSet}>
            <input type="hidden" name="targetSetId" value={id} />
            <button type="submit" className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold">
              Activate version
            </button>
          </form>
        )}
        <form action={duplicateEapTargetSet} className="flex items-center gap-2">
          <input type="hidden" name="targetSetId" value={id} />
          <input
            name="newYear"
            type="number"
            defaultValue={set.year + 1}
            className="w-24 rounded-xl border border-line px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold">
            Duplicate for year
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold text-ink">Change history</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {(audit ?? []).map((row) => (
            <li key={row.id}>
              <span className="font-medium text-ink">{row.action}</span> ·{' '}
              {new Date(row.created_at).toLocaleString('en-ZA')}
            </li>
          ))}
          {(audit ?? []).length === 0 && <li>No audit events yet.</li>}
        </ul>
      </section>
    </div>
  )
}
