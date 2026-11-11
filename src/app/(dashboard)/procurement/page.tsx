import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { AssessmentList } from '@/components/assessments/AssessmentList'
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

  return (
    <div className="space-y-8">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Procurement' }]}
        title="Procurement scorecards"
        description={
          <>
            A <Term k="procurementScorecard">procurement scorecard</Term> scores supplier spend out of 25 points, plus 2 bonus
            points. It is one area of the full scorecard; continue to a full scorecard to count it towards the level.
          </>
        }
        actions={
          <Link href="/start?type=procurement" className={buttonStyles({ variant: 'primary' })}>
            <Plus aria-hidden /> New procurement scorecard
          </Link>
        }
      />
      {error ? (
        <Notice tone="bad" title="Your procurement scorecards could not be loaded">
          Refresh the page to try again. If it keeps happening, check your connection.
        </Notice>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-[18px] w-[18px]" aria-hidden />}
          title="No procurement scorecards yet"
          action={
            <Link href="/start?type=procurement" className={buttonStyles({ variant: 'secondary' })}>
              <Plus aria-hidden /> Start a procurement scorecard
            </Link>
          }
        >
          Enter a company’s total spend and its suppliers to see its procurement points.
        </EmptyState>
      ) : (
        <Card label={`${rows.length} procurement ${rows.length === 1 ? 'scorecard' : 'scorecards'}`} flush>
          <AssessmentList rows={rows} showCompany rememberAs="procurement" />
        </Card>
      )}
    </div>
  )
}
