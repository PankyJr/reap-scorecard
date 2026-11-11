import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GENERIC_CODES_USER_LABEL } from '@/lib/scorecard/generic/ux/workflow'
import { attachEapTargetSetToGenericAssessment, calculateGenericScorecardRun } from '../actions'
import { loadGenericAssessment } from '../load'
import { AssessmentAside, Flash, Shell, formatPoints } from '../ui'
import { Card, MoreOptions } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { reasonLink } from '@/lib/scorecard/generic/ux/reason-links'
import { reasonCopy } from '@/components/dashboard/needs-copy'
import { ChevronRight } from 'lucide-react'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { storedCalculation, workflowForLoaded } from '../workflow-context'

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Review' }

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview } = loaded

  /** Drives the attach prompt: no set linked yet, so MC and Skills cannot score. */
  const hasEapSet = Boolean(
    (assessment as { eap_target_set_id?: string | null }).eap_target_set_id ??
      assessment.eap_target_snapshot,
  )
  const workflow = workflowForLoaded(loaded, 'review')
  const base = `/scorecards/calculator/${assessmentId}/generic`

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="review"
      title="Review my scorecard"
      subtitle="Check what is still missing, then calculate to see the final result. Calculating saves the result; change something later and you calculate again."
      workflow={workflow}
      aside={
        <AssessmentAside
          preview={preview}
          workflow={workflow}
          stored={storedCalculation(loaded)}
        />
      }
    >
      <Flash searchParams={query} />

      <Card>
        {preview.readiness.complete ? (
          <p className="text-base text-ink">
            <span className="font-semibold">Everything needed is in.</span> Calculate to save the result and get the
            final B-BBEE level.
          </p>
        ) : (
          <p className="text-base text-ink">
            <span className="font-semibold">You can calculate now</span>, but the level will not be final until the items
            below are done. Points are still worked out for everything that is in.
          </p>
        )}
        <form action={calculateGenericScorecardRun} className="mt-4">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <PendingSubmitButton
            label="Calculate scorecard"
            pendingLabel="Calculating…"
            className={buttonStyles({ variant: 'primary', size: 'lg' })}
          />
        </form>
        {workflow.hasStoredCalculation ? (
          <Link href={`${base}/result`} className="mt-3 inline-block text-body font-semibold text-brand hover:underline">
            See the last saved result
          </Link>
        ) : null}
      </Card>

      {!hasEapSet && (
        <Notice
          tone="warn"
          title="Workforce targets are not attached"
          action={
            <form action={attachEapTargetSetToGenericAssessment}>
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <PendingSubmitButton label="Attach workforce targets" pendingLabel="Attaching…" className={buttonStyles({ variant: 'primary' })} />
            </form>
          }
        >
          Management control and skills development are measured against <Term k="eap">workforce (EAP) targets</Term>.
          Attach the active set for {assessment.measurement_year}. If none exists, a REAP administrator adds one under
          Workforce targets.
        </Notice>
      )}

      {!preview.readiness.complete ? (
        <Card label={`Still needed for a final level · ${new Set(preview.readiness.reasons).size}`} flush>
          {/* The engine's reasons, worded as actions (needs-copy.ts, the same as Home). Each row opens where it is fixed. */}
          <ul className="border-t border-line">
            {[...new Set(preview.readiness.reasons)].map((reason) => {
              const link = reasonLink(assessmentId, reason)
              const copy = reasonCopy(company.name, reason, link?.label ?? null)
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium text-ink">{copy.title}</span>
                    <span className="block text-meta text-label" title={reason}>
                      {copy.sub}
                    </span>
                  </span>
                  {link ? <ChevronRight className="h-4 w-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden /> : null}
                </>
              )
              return (
                <li key={reason} className="border-b border-line last:border-b-0">
                  {link ? (
                    <Link href={link.href} className="group flex min-h-14 items-center gap-3 px-6 py-3 transition-colors duration-150 hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 px-6 py-3">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      <MoreOptions label="Points by area and priority sub-minimums">
        <div className="relative overflow-x-auto rounded-control border border-line bg-surface">
          <table className="min-w-full text-left text-body">
            <thead className="bg-sunken text-meta text-label">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Area</th>
                <th scope="col" className="px-3 py-2 font-semibold">State</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Points</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {preview.elements.map((element) => (
                <tr key={element.elementKey} className="border-t border-line">
                  <td className="px-3 py-2 font-medium text-ink">{element.displayName}</td>
                  <td className="px-3 py-2 text-label">{element.status.replace(/_/g, ' ')}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatPoints(element.basePointsAchieved)} / {formatPoints(element.basePointsAvailable)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatPoints(element.bonusPointsAchieved)} / {formatPoints(element.bonusPointsAvailable)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2">
          {preview.prioritySubminimums.map((outcome) => (
            <li key={outcome.key} className="rounded-control border border-line bg-surface px-3 py-2 text-body">
              <p className="font-semibold text-ink">
                {outcome.label}{' '}
                <span className={outcome.passed === false ? 'text-bad' : outcome.passed === true ? 'text-ok' : 'text-label'}>
                  ({outcome.passed === false ? 'missed' : outcome.passed === true ? 'met' : 'not tested yet'})
                </span>
              </p>
              <p className="text-label">{outcome.explanation}</p>
            </li>
          ))}
        </ul>
        <p className="text-meta text-label">
          Rules: {GENERIC_CODES_USER_LABEL} ({preview.ruleSetKey}, version {preview.ruleSetVersion}).
        </p>
      </MoreOptions>
    </Shell>
  )
}
