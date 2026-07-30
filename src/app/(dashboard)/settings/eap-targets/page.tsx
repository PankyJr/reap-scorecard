import Link from 'next/link'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { createEapTargetSet } from './actions'

type PageProps = { searchParams: Promise<{ error?: string }> }

export default async function EapTargetsIndexPage({ searchParams }: PageProps) {
  await requireReapInternalAdmin()
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">REAP admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">EAP target sets</h1>
        <p className="mt-2 text-sm text-slate-600">
          Versioned Employment Equity / EAP targets for Management Control. Editing a set never silently changes
          already calculated Scorecard Assessments — recalculation is explicit.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-950">Create draft target set</h2>
        <form action={createEapTargetSet} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Name</span>
            <input
              name="name"
              required
              defaultValue={`National EAP ${year}`}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Year</span>
            <input
              name="year"
              type="number"
              required
              defaultValue={year}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Geography / scope</span>
            <input name="geography" placeholder="National" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="font-medium">Source reference</span>
            <input name="sourceReference" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white">
              Create draft
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-950">Existing sets</h2>
        {(sets ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No EAP target sets yet.</p>
        ) : (
          (sets ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/settings/eap-targets/${s.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-[#063b3f]/40"
            >
              <span>
                <span className="font-semibold text-slate-900">{s.name}</span>
                <span className="ml-2 text-slate-500">
                  {s.year}
                  {s.geography ? ` · ${s.geography}` : ''} · v{s.version}
                </span>
              </span>
              <span className="capitalize text-slate-600">{s.status}</span>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
