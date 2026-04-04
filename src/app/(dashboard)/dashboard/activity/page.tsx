import { createClient } from '@/utils/supabase/server'
import { Activity } from 'lucide-react'
import { redirect } from 'next/navigation'

const ACTION_LABELS: Record<string, string> = {
  'company.deleted': 'Company deleted',
  'company.created': 'Company created',
  'company.updated': 'Company updated',
  'scorecard.created': 'Scorecard created',
  'scorecard.deleted': 'Scorecard deleted',
  'scorecard.updated': 'Scorecard updated',
  'procurement_assessment.created': 'Procurement assessment created',
  'procurement_assessment.updated': 'Procurement assessment updated',
  'procurement_assessment.deleted': 'Procurement assessment deleted',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function formatActor(actorEmail: string | null, actorId: string | null): string {
  if (actorEmail) return actorEmail
  if (actorId) return 'User'
  return '—'
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entries } = await supabase
    .from('audit_log')
    .select('id, action, entity_type, entity_name, actor_email, actor_id, created_at')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const hasEntries = !!entries && entries.length > 0

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        <div className="border-b border-slate-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Activity
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Recent actions on companies, scorecards, and assessments.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              Recent activity
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Key changes recorded for audit and traceability.
            </p>
          </div>

          {hasEntries ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      Action
                    </th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      Actor
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em]">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {actionLabel(row.action)}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {row.entity_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatActor(row.actor_email, row.actor_id)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 tabular-nums">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                <Activity className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-800">No activity yet</p>
              <p className="mt-1 max-w-md mx-auto text-[13px] leading-relaxed text-slate-500">
                You will see actions like company creation, scorecard saves, and procurement updates here as you use the platform—an audit trail for your workspace.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
