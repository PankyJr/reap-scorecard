import Link from 'next/link'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { createEapTargetSet } from './actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'

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
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Workforce targets' }]}
        title="Workforce targets"
        description={
          <>
            The <Term k="eap">economically active population (EAP)</Term> shares that management control and skills
            development are measured against. Add one set per year from the Commission for Employment Equity figures; new full
            scorecards for that year use the active set.
          </>
        }
      />

      {error ? (
        <Notice tone="bad" title="That did not work">
          {error}
        </Notice>
      ) : null}

      <Panel title="Existing sets" description="Saved calculations keep the set they were calculated with; editing a set never changes them.">
        {(sets ?? []).length === 0 ? (
          <p className="text-[15px] text-muted">No sets yet. Create the first one below.</p>
        ) : (
          <ul className="divide-y divide-line rounded-control border border-line">
            {(sets ?? []).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/settings/eap-targets/${s.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-[15px] hover:bg-brand-soft"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{s.name}</span>
                    <span className="block text-sm text-muted">
                      {s.year}
                      {s.geography ? `, ${s.geography}` : ''}, version {s.version}
                    </span>
                  </span>
                  <StatusBadge tone={s.status === 'active' ? 'ok' : s.status === 'draft' ? 'warn' : 'neutral'}>
                    {s.status === 'active' ? 'In use' : s.status === 'draft' ? 'Draft' : 'Replaced'}
                  </StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Create a new set" description="You enter the six shares on the next screen, then make it the one in use.">
        <form action={createEapTargetSet} className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[15px]">
            <span className="font-semibold text-ink">Name</span>
            <input name="name" required defaultValue={`National EAP ${year}`} className="mt-1 block w-full rounded-control border border-line-strong px-3 py-2.5 text-base" />
          </label>
          <label className="block text-[15px]">
            <span className="font-semibold text-ink">Year</span>
            <input name="year" type="number" required defaultValue={year} className="mt-1 block w-full rounded-control border border-line-strong px-3 py-2.5 text-base" />
          </label>
          <label className="block text-[15px]">
            <span className="font-semibold text-ink">Area (optional)</span>
            <input name="geography" placeholder="National" className="mt-1 block w-full rounded-control border border-line-strong px-3 py-2.5 text-base" />
          </label>
          <label className="block text-[15px]">
            <span className="font-semibold text-ink">Source (optional)</span>
            <input name="sourceReference" placeholder="For example, CEE annual report 2025" className="mt-1 block w-full rounded-control border border-line-strong px-3 py-2.5 text-base" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={buttonStyles({ variant: 'primary' })}>
              Create and enter the shares
            </button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
