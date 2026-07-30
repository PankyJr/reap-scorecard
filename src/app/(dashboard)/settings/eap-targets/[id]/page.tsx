import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { expectedEapCells } from '@/lib/scorecard/calculator/eap/demographics'
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

  const valueMap = new Map(
    (values ?? []).map((v) => [`${v.band_key}__${v.demographic_key}`, Number(v.target_value)]),
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link href="/settings/eap-targets" className="text-sm font-medium text-slate-600">
        ← EAP target sets
      </Link>

      <header>
        <h1 className="text-3xl font-semibold text-slate-950">{set.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Year {set.year} · v{set.version} · <span className="capitalize">{set.status}</span>
          {set.geography ? ` · ${set.geography}` : ''}
        </p>
      </header>

      {q.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{q.error}</div>
      )}
      {(q.saved || q.activated) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {q.activated ? 'Target set activated.' : 'Values saved.'}
        </div>
      )}

      <form action={saveEapTargetValues} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <input type="hidden" name="targetSetId" value={id} />
        <h2 className="text-sm font-semibold text-slate-950">Target matrix (fractions 0–1)</h2>
        <p className="text-sm text-slate-500">
          Structure matches verified Management Control demographics. Disabilities supports black_people only.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Band</th>
                <th className="py-2 pr-3">Demographic</th>
                <th className="py-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {expectedEapCells().map((cell) => {
                const key = `${cell.bandKey}__${cell.demographicKey}`
                return (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="py-2 pr-3">{cell.bandKey.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3">{cell.demographicKey.replace(/_/g, ' ')}</td>
                    <td className="py-2">
                      <input
                        name={key}
                        type="number"
                        step="0.0001"
                        min={0}
                        max={1}
                        defaultValue={valueMap.get(key) ?? 0}
                        className="w-28 rounded-lg border border-slate-200 px-2 py-1"
                        disabled={set.status === 'retired'}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {set.status !== 'retired' && (
          <button type="submit" className="rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white">
            Save values
          </button>
        )}
      </form>

      <div className="flex flex-wrap gap-3">
        {set.status === 'draft' && (
          <form action={activateEapTargetSet}>
            <input type="hidden" name="targetSetId" value={id} />
            <button type="submit" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
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
            className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
            Duplicate for year
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-950">Change history</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {(audit ?? []).map((row) => (
            <li key={row.id}>
              <span className="font-medium text-slate-900">{row.action}</span> ·{' '}
              {new Date(row.created_at).toLocaleString('en-ZA')}
            </li>
          ))}
          {(audit ?? []).length === 0 && <li>No audit events yet.</li>}
        </ul>
      </section>
    </div>
  )
}
