import { createClient } from '@/utils/supabase/server'
import { Activity, Calculator, CheckCircle2, FileSpreadsheet, Link2, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { RelativeTime } from '@/components/ui/RelativeTime'
import { formatDate } from '@/components/ui/format'
import { cn } from '@/components/ui/cn'
import { redirect } from 'next/navigation'
import {
  actionLabel,
  mergeActivityEntries,
  toScorecardEntries,
  toWorkspaceEntries,
} from '@/lib/activity/entries'

export const metadata = { title: { absolute: 'Activity | REAP' } }

const FEED_LIMIT = 100

/** "14:32", South African time. */
function timeOfDay(value: string): string {
  return new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

/** The icon and tint for an action, by what it did. */
function actionLook(action: string): { icon: LucideIcon; tint: string } {
  if (action.endsWith('.deleted') || action.endsWith('.detached')) return { icon: action.endsWith('.detached') ? Link2 : Trash2, tint: 'bg-danger-soft text-danger' }
  if (action === 'scorecard.calculated') return { icon: Calculator, tint: 'bg-progress-soft text-progress' }
  if (action.startsWith('workbook.')) return { icon: FileSpreadsheet, tint: 'bg-progress-soft text-progress' }
  if (action.endsWith('.created')) return { icon: Plus, tint: 'bg-success-soft text-success' }
  if (action.includes('evidence') || action.endsWith('.attached')) return { icon: action.endsWith('.attached') ? Link2 : CheckCircle2, tint: 'bg-success-soft text-success' }
  return { icon: Pencil, tint: 'bg-neutral-soft text-neutral' }
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

  // Grouped by day (South African time): "Today", then "06 Oct 2026".
  const today = formatDate(new Date())
  const days: Array<{ label: string; items: typeof entries }> = []
  for (const entry of entries) {
    const day = entry.createdAt ? formatDate(entry.createdAt) : '—'
    const label = day === today ? 'Today' : day
    const last = days.at(-1)
    if (last && last.label === label) last.items.push(entry)
    else days.push({ label, items: [entry] })
  }

  return (
    <div className="space-y-6" data-tour="activity-main">
      <PageHeader title="Activity" icon={Activity} description="Recent actions on companies, scorecards, and assessments." />

      <section className="border-t border-line pt-6" aria-label="Recent activity">
        {days.length > 0 ? (
          <div className="max-w-[760px] space-y-8">
            {days.map((day) => (
              <div key={day.label}>
                <h2 className="pb-3 text-meta font-medium text-label">{day.label}</h2>
                <ol>
                  {day.items.map((row, index) => {
                    const look = actionLook(row.action)
                    const Icon = look.icon
                    const last = index === day.items.length - 1
                    return (
                      <li key={row.id} className="relative flex gap-3 pb-5 last:pb-0">
                        {/* The line down the left, joining one entry's icon to the next. */}
                        {!last ? <span className="absolute bottom-0 left-4 top-9 w-px bg-line" aria-hidden /> : null}
                        <span className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full', look.tint)} aria-hidden>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <p className="text-body text-label">
                              <span className="font-medium text-ink">{actionLabel(row.action)}</span>
                              {row.entityName ? <> · {row.entityName}</> : null}
                            </p>
                            <p className="truncate text-meta text-label">{formatActor(row.actorEmail, row.actorId)}</p>
                          </div>
                          {row.createdAt ? (
                            day.label === 'Today' ? (
                              <RelativeTime value={row.createdAt} prefix="" className="shrink-0 whitespace-nowrap text-meta tabular-nums text-label" />
                            ) : (
                              // Older days already say the date above: the time of day is enough here.
                              <time dateTime={row.createdAt} className="shrink-0 whitespace-nowrap text-meta tabular-nums text-label">
                                {timeOfDay(row.createdAt)}
                              </time>
                            )
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Activity aria-hidden />} title="No activity yet">
            You will see actions like company creation, scorecard saves, and procurement updates here as you use the platform: an
            audit trail for your workspace.
          </EmptyState>
        )}
      </section>
    </div>
  )
}
