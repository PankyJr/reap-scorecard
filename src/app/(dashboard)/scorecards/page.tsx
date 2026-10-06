import Link from 'next/link'
import { FileBarChart2, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, MoreOptions } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { AssessmentList } from '@/components/assessments/AssessmentList'
import { byRecent, FULL_SCORECARD_LIST_COLUMNS, fullScorecardToRow, type StoredFullScorecard } from '@/lib/assessments/rows'

export const metadata = { title: 'Full scorecards' }

export default async function FullScorecardsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: scorecards, error }, { data: legacy }, { data: workbooks }] = await Promise.all([
    supabase
      .from('scorecard_assessments')
      .select(`${FULL_SCORECARD_LIST_COLUMNS}, companies!inner(id, name, owner_id)`)
      .eq('companies.owner_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase.from('scorecards').select('id, total_score, score_level, created_at, companies!inner(name, owner_id)').eq('companies.owner_id', user.id).order('created_at', { ascending: false }),
    supabase.from('scorecard_workbooks').select('id, filename, uploaded_at, companies!inner(name, owner_id)').eq('companies.owner_id', user.id).order('uploaded_at', { ascending: false }),
  ])

  const rows = ((scorecards ?? []) as unknown as StoredFullScorecard[]).map((r) => fullScorecardToRow(r)).sort(byRecent)
  const legacyRows = (legacy ?? []) as unknown as Array<{ id: string; total_score: number | null; score_level: string | null; created_at: string; companies: { name: string } }>
  const workbookRows = (workbooks ?? []) as unknown as Array<{ id: string; filename: string; uploaded_at: string; companies: { name: string } }>

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Full scorecards' }]}
        title="Full scorecards"
        description={
          <>
            A <Term k="fullScorecard">full scorecard</Term> scores all seven areas and gives the company its{' '}
            <Term k="level">B-BBEE level</Term>.
          </>
        }
        actions={
          <Link href="/start?type=full" className={buttonStyles({ variant: 'primary' })}>
            <Plus className="h-4 w-4" aria-hidden /> New full scorecard
          </Link>
        }
      />

      {error ? (
        <Panel>
          <p className="text-base text-bad">Your scorecards could not be loaded. Refresh the page to try again.</p>
        </Panel>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileBarChart2 className="h-6 w-6" aria-hidden />}
          title="No full scorecards yet"
          action={
            <Link href="/start?type=full" className={buttonStyles({ variant: 'primary' })}>
              Start a full scorecard
            </Link>
          }
        >
          Start one for a company, upload its REAP scorecard workbook, and the app works out the level.
        </EmptyState>
      ) : (
        <AssessmentList rows={rows} />
      )}

      <MoreOptions label="Older and specialist tools">
        <ul className="space-y-3 text-[15px]">
          <li>
            <Link href="/scorecards/new?mode=modular" className="font-semibold text-brand hover:underline">
              Score selected elements only
            </Link>
            <span className="block text-muted">Upload separate registers for one or a few areas. Does not give a B-BBEE level.</span>
          </li>
          <li>
            <Link href="/scorecards/new?legacy=1" className="font-semibold text-brand hover:underline">
              Type in element points by hand
            </Link>
            <span className="block text-muted">The original manual scorecard, for points already worked out elsewhere.</span>
          </li>
          <li>
            <span className="font-semibold text-ink">Older workbook calculator</span>
            <span className="block text-muted">Open it from a company page under “More options”.</span>
          </li>
        </ul>
        {legacyRows.length > 0 ? (
          <div>
            <p className="pb-2 text-[15px] font-semibold text-ink">Hand-entered scorecards</p>
            <ul className="divide-y divide-line rounded-control border border-line bg-surface">
              {legacyRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
                  <span className="min-w-0 truncate">
                    {r.companies?.name} · {r.score_level ?? 'No level'} · {Number(r.total_score ?? 0).toFixed(2)} points
                  </span>
                  <Link href={`/scorecards/${r.id}`} className="shrink-0 font-semibold text-brand hover:underline">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {workbookRows.length > 0 ? (
          <div>
            <p className="pb-2 text-[15px] font-semibold text-ink">Older workbook calculator</p>
            <ul className="divide-y divide-line rounded-control border border-line bg-surface">
              {workbookRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
                  <span className="min-w-0 truncate">
                    {r.companies?.name} · {r.filename}
                  </span>
                  <Link href={`/scorecards/full/${r.id}`} className="shrink-0 font-semibold text-brand hover:underline">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </MoreOptions>
    </div>
  )
}
