import { createClient } from '@/utils/supabase/server'
import { Activity } from 'lucide-react'
import { redirect } from 'next/navigation'
import {
  actionLabel,
  mergeActivityEntries,
  toScorecardEntries,
  toWorkspaceEntries,
} from '@/lib/activity/entries'

const FEED_LIMIT = 100

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

  // Two trails, one feed. `audit_log` covers companies, legacy scorecards and
  // procurement; `scorecard_assessment_audit_log` covers everything the generic
  // scorecard engine records. Reading only the first is why this page looked
  // empty while the engine had been writing faithfully all along.
  const [workspaceResult, scorecardResult] = await Promise.all([
    supabase
      .from('audit_log')
      .select('id, action, entity_type, entity_name, actor_email, actor_id, created_at')
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(FEED_LIMIT),
    supabase
      .from('scorecard_assessment_audit_log')
      .select('id, action, element_key, actor, created_at, scorecard_assessments(name)')
      .eq('actor', user.id)
      .order('created_at', { ascending: false })
      .limit(FEED_LIMIT),
  ])

  const entries = mergeActivityEntries(
    toWorkspaceEntries(workspaceResult.data),
    toScorecardEntries(scorecardResult.data),
    FEED_LIMIT,
  )

  const hasEntries = entries.length > 0

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6" data-tour="activity-main">
        <div className="border-b border-line pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Activity
          </h1>
          <p className="mt-1 text-sm text-muted">
            Recent actions on companies, scorecards, and assessments.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface/95 shadow-sm">
          <div className="border-b border-line px-6 py-4">
            <h2 className="text-base font-semibold text-ink sm:text-lg">
              Recent activity
            </h2>
            <p className="mt-1 text-sm text-muted sm:text-sm">
              Key changes recorded for audit and traceability.
            </p>
          </div>

          {hasEntries ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-sunken/80 text-muted">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium">
                      Action
                    </th>
                    <th className="px-6 py-3 text-sm font-medium">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-sm font-medium">
                      Actor
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-medium">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {entries.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-sunken/70"
                    >
                      <td className="px-6 py-4 font-medium text-ink">
                        {actionLabel(row.action)}
                      </td>
                      <td className="px-6 py-4 text-ink">
                        {row.entityName ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {formatActor(row.actorEmail, row.actorId)}
                      </td>
                      <td className="px-6 py-4 text-right text-muted tabular-nums">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString(undefined, {
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-sunken text-faint">
                <Activity className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-ink">No activity yet</p>
              <p className="mt-1 max-w-md mx-auto text-[15px] leading-relaxed text-muted">
                You will see actions like company creation, scorecard saves, and procurement updates here as you use the platform—an audit trail for your workspace.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
