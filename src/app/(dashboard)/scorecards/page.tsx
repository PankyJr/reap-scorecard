import Link from 'next/link'
import { FileBarChart2, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { MoreOptions } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { AssessmentList } from '@/components/assessments/AssessmentList'
import { byRecent, FULL_SCORECARD_LIST_COLUMNS, fullScorecardToRow, type StoredFullScorecard } from '@/lib/assessments/rows'

export const metadata = { title: 'Full scorecards' }

export default async function FullScorecardsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: statusParam } = await searchParams
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

  const stored = (scorecards ?? []) as unknown as StoredFullScorecard[]
  const rows = stored.map((r) => fullScorecardToRow(r)).sort(byRecent)
  // The same filter, words and buckets as /companies.
  const calculated = new Set(stored.filter((r) => r.overall_result_snapshot != null).map((r) => r.id))
  const bucketOf = (row: (typeof rows)[number]) => (row.status.finished ? 'finished' : calculated.has(row.id) ? 'not-final' : 'in-progress')
  const filter = FILTERS.some((f) => f.value === statusParam) ? statusParam! : 'all'
  const shown = filter === 'all' ? rows : rows.filter((row) => bucketOf(row) === filter)
  const countOf = (value: string) => (value === 'all' ? rows.length : rows.filter((row) => bucketOf(row) === value).length)
  const legacyRows = (legacy ?? []) as unknown as Array<{ id: string; total_score: number | null; score_level: string | null; created_at: string; companies: { name: string } }>
  const workbookRows = (workbooks ?? []) as unknown as Array<{ id: string; filename: string; uploaded_at: string; companies: { name: string } }>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Full scorecards"
        icon={FileBarChart2}
        description={
          <>
            A <Term k="fullScorecard">full scorecard</Term> scores all seven areas and gives the company its{' '}
            <Term k="level">B-BBEE level</Term>.
          </>
        }
        actions={
          <Link href="/start?type=full" className={buttonStyles({ variant: 'primary' })}>
            <Plus aria-hidden /> New full scorecard
          </Link>
        }
      />

      {error ? (
        <Notice tone="bad" title="Your scorecards could not be loaded">
          Refresh the page to try again. If it keeps happening, check your connection.
        </Notice>
      ) : rows.length === 0 ? (
        <div className="border-t border-line">
          <EmptyState
            icon={<FileBarChart2 aria-hidden />}
            title="No full scorecards yet"
            action={
              <Link href="/start?type=full" className={buttonStyles({ variant: 'primary' })}>
                <Plus aria-hidden /> Start a full scorecard
              </Link>
            }
          >
            Start one for a company, upload its REAP scorecard workbook, and the app works out the level.
          </EmptyState>
        </div>
      ) : (
        <section className="space-y-4 border-t border-line pt-6" aria-label="Your full scorecards">
          <Segmented
            label="Show scorecards"
            value={filter}
            options={FILTERS.map((f) => ({ value: f.value, label: f.label, count: countOf(f.value), href: f.value === 'all' ? '/scorecards' : `/scorecards?status=${f.value}` }))}
          />
          {shown.length === 0 ? (
            <EmptyState icon={<FileBarChart2 aria-hidden />} title="No scorecards here">
              None of your full scorecards match this filter.
            </EmptyState>
          ) : (
            <AssessmentList rows={shown} rememberAs="scorecards" />
          )}
        </section>
      )}

      <MoreOptions label="Older and specialist tools">
        <ul className="divide-y divide-line">
          <li className="py-3 first:pt-0">
            <Link href="/scorecards/new?mode=modular" className="text-body font-medium text-teal hover:underline">
              Score selected elements only
            </Link>
            <span className="block text-meta text-label">Upload separate registers for one or a few areas. Does not give a B-BBEE level.</span>
          </li>
          <li className="py-3">
            <Link href="/scorecards/new?legacy=1" className="text-body font-medium text-teal hover:underline">
              Type in element points by hand
            </Link>
            <span className="block text-meta text-label">The original manual scorecard, for points already worked out elsewhere.</span>
          </li>
          <li className="py-3">
            <span className="text-body font-medium text-ink">Older workbook calculator</span>
            <span className="block text-meta text-label">Open it from a company page under “Older and specialist tools”.</span>
          </li>
        </ul>
        {legacyRows.length > 0 ? (
          <div>
            <p className="pb-2 text-body font-medium text-ink">Hand-entered scorecards</p>
            <ul className="divide-y divide-divider border-y border-line">
              {legacyRows.map((r) => (
                <li key={r.id} className="flex min-h-[52px] items-center justify-between gap-3 text-body">
                  <span className="min-w-0 truncate">
                    {r.companies?.name} · {r.score_level ?? 'No level'} · {Number(r.total_score ?? 0).toFixed(2)} points
                  </span>
                  <Link href={`/scorecards/${r.id}`} className="shrink-0 font-medium text-teal hover:underline">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {workbookRows.length > 0 ? (
          <div>
            <p className="pb-2 text-body font-medium text-ink">Older workbook calculator</p>
            <ul className="divide-y divide-divider border-y border-line">
              {workbookRows.map((r) => (
                <li key={r.id} className="flex min-h-[52px] items-center justify-between gap-3 text-body">
                  <span className="min-w-0 truncate">
                    {r.companies?.name} · {r.filename}
                  </span>
                  <Link href={`/scorecards/full/${r.id}`} className="shrink-0 font-medium text-teal hover:underline">
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

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'not-final', label: 'Not final' },
  { value: 'finished', label: 'Finished' },
]
