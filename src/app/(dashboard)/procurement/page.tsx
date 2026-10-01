import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
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
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Procurement' }]}
        title="Procurement scorecards"
        description={
          <>
            A <Term k="procurementScorecard">procurement scorecard</Term> scores supplier spend out of 29 points. It is one
            element of the full scorecard; attach it to a full scorecard to count it towards the level.
          </>
        }
        actions={
          <Link href="/start?type=procurement" className={buttonStyles({ variant: 'primary' })}>
            <Plus className="h-4 w-4" aria-hidden /> New procurement scorecard
          </Link>
        }
      />
      {error ? (
        <Panel>
          <p className="text-base text-bad">Your procurement scorecards could not be loaded. Refresh the page to try again.</p>
        </Panel>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" aria-hidden />}
          title="No procurement scorecards yet"
          action={
            <Link href="/start?type=procurement" className={buttonStyles({ variant: 'primary' })}>
              Start a procurement scorecard
            </Link>
          }
        >
          Enter a company’s total spend and its suppliers to see its procurement points.
        </EmptyState>
      ) : (
        <AssessmentList rows={rows} />
      )}
    </div>
  )
}
