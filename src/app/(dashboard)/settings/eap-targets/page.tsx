import Link from 'next/link'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { createEapTargetSet } from './actions'

type PageProps = { searchParams: Promise<{ error?: string }> }

export default async function EapTargetsIndexPage({ searchParams }: PageProps) {
  await requireReapInternalAdmin({ loginNext: '/settings/eap-targets' })
  const { error } = await searchParams
  const admin = createServiceRoleSupabase()
  const { data: sets } = await admin
    .from('eap_target_sets')
    .select('id, name, year, geography, version, status, updated_at')
    .order('year', { ascending: false })

  const year = new Date().getFullYear()

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-muted">REAP admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">EAP target sets</h1>
        <p className="mt-2 text-sm text-muted">
          Versioned Employment Equity / EAP targets for Management Control. Editing a set never silently changes
          already calculated Scorecard Assessments — recalculation is explicit.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">{error}</div>
      )}

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Create draft target set</h2>
        <form action={createEapTargetSet} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Name</span>
            <input
              name="name"
              required
              defaultValue={`National EAP ${year}`}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Year</span>
            <input
              name="year"
              type="number"
              required
              defaultValue={year}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Geography / scope</span>
            <input name="geography" placeholder="National" className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="font-medium">Source reference</span>
            <input name="sourceReference" className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">
              Create draft
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Existing sets</h2>
        {(sets ?? []).length === 0 ? (
          <p className="text-sm text-muted">No EAP target sets yet.</p>
        ) : (
          (sets ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/settings/eap-targets/${s.id}`}
              className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-sm hover:border-brand/40"
            >
              <span>
                <span className="font-semibold text-ink">{s.name}</span>
                <span className="ml-2 text-muted">
                  {s.year}
                  {s.geography ? ` · ${s.geography}` : ''} · v{s.version}
                </span>
              </span>
              <span className="capitalize text-muted">{s.status}</span>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
