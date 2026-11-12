import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { AssessmentList } from '@/components/assessments/AssessmentList'
import { PageHelpData } from '@/components/help/PageHelpData'
import { HelpLink } from '@/components/help/HelpLink'
import { byRecent, PROCUREMENT_LIST_COLUMNS, procurementToRow, type StoredProcurement } from '@/lib/assessments/rows'

export const metadata = { title: 'Procurement scorecards' }

export default async function ProcurementListPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('procurement_assessments')
    .select(`${PROCUREMENT_LIST_COLUMNS}, companies!inner(id, name, owner_id)`)
    .eq('companies.owner_id', user.id)
    .order('created_at', { ascending: false })

  const rows = ((data ?? []) as unknown as StoredProcurement[]).map((r) => procurementToRow(r)).sort(byRecent)
  const latest = rows[0] ?? null

  return (
    <div className="space-y-6">
      <PageHelpData
        page="procurement"
        data={{
          count: rows.length,
          latest: latest ? { href: latest.status.href, label: `${latest.companyName}, ${latest.title}` } : null,
        }}
      />
      <PageHeader
        title="Procurement scorecards"
        icon={ClipboardList}
        description={
          <span data-help="procurement-intro">
            A <Term k="procurementScorecard">procurement scorecard</Term> scores supplier spend out of 25 points, plus 2{' '}
            <Term k="bonusPoints">bonus points</Term>. It is one area of the full scorecard; continue to a full scorecard to count
            it towards the level.
          </span>
        }
        actions={
          <Link href="/start?type=procurement" data-help="procurement-start" className={buttonStyles({ variant: 'primary' })}>
            <Plus aria-hidden /> New procurement scorecard
          </Link>
        }
      />
      {error ? (
        <Notice tone="bad" title="Your procurement scorecards could not be loaded">
          Refresh the page to try again. If it keeps happening, check your connection.
        </Notice>
      ) : rows.length === 0 ? (
        <div className="border-t border-line">
          <EmptyState
            icon={<ClipboardList aria-hidden />}
            title="No procurement scorecards yet"
            action={
              <Link href="/start?type=procurement" className={buttonStyles({ variant: 'primary' })}>
                <Plus aria-hidden /> Start a procurement scorecard
              </Link>
            }
          >
            Upload a company’s supplier list and its total spend to see its procurement points.
            <span className="mt-1 block">
              <HelpLink />
            </span>
          </EmptyState>
        </div>
      ) : (
        <section className="border-t border-line pt-6" aria-label="Your procurement scorecards" data-help="procurement-list">
          <AssessmentList rows={rows} showCompany rememberAs="procurement" />
        </section>
      )}
    </div>
  )
}
