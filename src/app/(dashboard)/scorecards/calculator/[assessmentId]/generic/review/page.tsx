import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GENERIC_CODES_USER_LABEL } from '@/lib/scorecard/generic/ux/workflow'
import { attachEapTargetSetToGenericAssessment, calculateGenericScorecardRun } from '../actions'
import { loadGenericAssessment } from '../load'
import { AssessmentAside, Flash, Shell, formatPoints } from '../ui'
import { MoreOptions, SectionTitle } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { reasonLink } from '@/lib/scorecard/generic/ux/reason-links'
import { reasonCopy } from '@/components/dashboard/needs-copy'
import { ArrowRight, Check, Circle, CircleDot } from 'lucide-react'
import { MiniBar } from '@/components/ui/MiniBar'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/components/ui/cn'
import { AREA_COPY, areaKeyForSlug, type AreaKey } from '@/lib/scorecard/generic/ux/areas'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { storedCalculation, workflowForLoaded } from '../workflow-context'
import { PageHelpData } from '@/components/help/PageHelpData'
import { WhyLink } from '@/components/help/HelpLink'

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

  // STILL NEEDED (Dmitry Sergushkin progressive checklist): the engine's
  // reasons, worded as actions (needs-copy.ts, as on Home), grouped by the area
  // where each is fixed. Identical lines show once (on screen only).
  const seen = new Set<string>()
  const groups = new Map<string, { key: AreaKey | null; label: string; items: Array<{ reason: string; title: string; sub: string; href: string | null; started: boolean }> }>()
  for (const reason of preview.readiness.reasons) {
    const link = reasonLink(assessmentId, reason)
    const copy = reasonCopy(company.name, reason, link?.label ?? null)
    const dedupe = `${copy.title}|${copy.sub}|${link?.href ?? ''}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    const areaKey = link ? areaKeyForSlug(link.href.split('/').at(-1) ?? '') : null
    const groupId = areaKey ?? 'other'
    if (!groups.has(groupId)) groups.set(groupId, { key: areaKey, label: areaKey ? AREA_COPY[areaKey].label : 'Other', items: [] })
    const element = areaKey ? preview.elements.find((e) => e.elementKey === areaKey) : undefined
    groups.get(groupId)!.items.push({ reason, ...copy, href: link?.href ?? null, started: Boolean(element && element.status !== 'not_started') })
  }
  const neededCount = [...groups.values()].reduce((n, g) => n + g.items.length, 0)
  const doneCount = workflow.completedCount
  const totalCount = workflow.items.length
  const firstNeeded = [...groups.values()][0]?.items[0] ?? null

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
        <div data-help="review-level">
          <AssessmentAside
            preview={preview}
            workflow={workflow}
            stored={storedCalculation(loaded)}
            company={company.name}
            year={assessment.measurement_year}
            assessmentId={assessmentId}
          />
        </div>
      }
    >
      <Flash searchParams={query} />
      <PageHelpData
        page="review"
        data={{
          complete: preview.readiness.complete,
          stillNeeded: neededCount,
          first: firstNeeded ? { title: firstNeeded.title, href: firstNeeded.href } : null,
          eapAttached: hasEapSet,
          hasSaved: workflow.hasStoredCalculation,
          needsRecalculation: workflow.needsRecalculation,
          selfHref: `${base}/review`,
          resultHref: `${base}/result`,
        }}
      />

      <section id="calculate" className="space-y-4" aria-label="Calculate" data-help="review-calculate">
        <div>
          <p className="flex items-baseline justify-between text-meta">
            <span className="font-medium text-ink">{preview.readiness.complete ? 'Everything needed is in' : 'You can calculate now'}</span>
            <span className="tabular-nums text-label">
              {doneCount} of {totalCount} done
            </span>
          </p>
          <MiniBar value={doneCount} max={totalCount} width="w-full" className="mt-2 block h-1.5" />
        </div>
        <p className="text-body text-label">
          {preview.readiness.complete ? (
            <>
              Calculate to save the result and get the final <Term k="level">B-BBEE level</Term>.
            </>
          ) : (
            <>
              The <Term k="level">level</Term> will not be final until the items below are done. Points are still worked out for
              everything that is in.
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <form action={calculateGenericScorecardRun}>
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <PendingSubmitButton label="Calculate scorecard" pendingLabel="Calculating…" className={buttonStyles({ variant: 'primary' })} />
          </form>
          {workflow.hasStoredCalculation ? (
            <Link href={`${base}/result`} className={buttonStyles({ variant: 'plain' })}>
              See the last saved result
            </Link>
          ) : null}
        </div>
      </section>

      {!hasEapSet && (
        <div id="eap-targets" data-help="review-eap">
        <Notice
          tone="warn"
          title="Workforce targets are not attached"
          action={
            <form action={attachEapTargetSetToGenericAssessment}>
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <PendingSubmitButton label="Attach workforce targets" pendingLabel="Attaching…" className={buttonStyles({ variant: 'secondary', size: 'sm' })} />
            </form>
          }
        >
          Management control and skills development are measured against <Term k="eap">workforce (EAP) targets</Term>.
          Attach the active set for {assessment.measurement_year}. If none exists, a REAP administrator adds one under
          Workforce targets.
        </Notice>
        </div>
      )}

      {!preview.readiness.complete ? (
        <section className="border-t border-line pt-6" aria-labelledby="still-needed" data-help="review-still-needed">
          <SectionTitle id="still-needed">
            Still needed for a final level <span className="font-normal text-label">{neededCount}</span>
          </SectionTitle>
          <div className="mt-4 space-y-5">
            {[...groups.entries()].map(([id, group]) => (
              <div key={id}>
                <p className="flex items-center gap-2 pb-1 text-meta font-medium text-label">
                  <span className={cn('h-2 w-2 rounded-full', group.key ? AREA_DOT[group.key] ?? 'bg-icon' : 'bg-icon')} aria-hidden />
                  {group.label}
                </p>
                <ul className="divide-y divide-divider border-y border-line">
                  {group.items.map((item) => (
                    <li key={item.reason} className="flex min-h-[60px] items-center gap-3 py-2.5">
                      {item.started ? (
                        <CircleDot className="h-5 w-5 shrink-0 text-teal" aria-hidden />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-control-line" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-medium text-ink">{item.title}</span>
                        <span className="block text-meta text-label" title={item.reason}>
                          {item.sub}
                        </span>
                      </span>
                      {item.href ? (
                        <Link href={item.href} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'shrink-0' })}>
                          {item.started ? 'Finish' : 'Start'} <ArrowRight aria-hidden />
                        </Link>
                      ) : (
                        <Chip tone="neutral" className="shrink-0">To check</Chip>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="flex items-center gap-2 border-t border-line pt-6 text-body text-ink">
          <Check className="h-4 w-4 text-success" aria-hidden /> Nothing is missing.
        </p>
      )}

      <div data-help="review-details">
      <MoreOptions label="Points by area and priority sub-minimums">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-body">
            <thead className="border-b border-line">
              <tr>
                <th scope="col" className="h-10 pr-3 text-caps font-medium text-subtle">
                  <Term k="element">Area</Term>
                </th>
                <th scope="col" className="h-10 px-3 text-caps font-medium text-subtle">State</th>
                <th scope="col" className="h-10 px-3 text-right text-caps font-medium text-subtle">Points</th>
                <th scope="col" className="h-10 pl-3 text-right text-caps font-medium text-subtle">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {preview.elements.map((element) => (
                <tr key={element.elementKey} className="border-b border-divider last:border-b-0">
                  <td className="h-[52px] pr-3 font-medium text-ink">{element.displayName}</td>
                  <td className="px-3 text-label">{element.status.replace(/_/g, ' ')}</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums">
                    {formatPoints(element.basePointsAchieved)} <span className="text-label">of {formatPoints(element.basePointsAvailable)}</span>
                    {element.basePointsAchieved === 0 ? <WhyLink problem="review-zero" className="ml-2" /> : null}
                  </td>
                  <td className="whitespace-nowrap pl-3 text-right tabular-nums">
                    {formatPoints(element.bonusPointsAchieved)} <span className="text-label">of {formatPoints(element.bonusPointsAvailable)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-meta text-label">
          Each <Term k="priorityElement">priority area</Term> must reach its <Term k="subMinimum">sub-minimum</Term>, or the level
          drops by one.
        </p>
        <ul className="divide-y divide-divider border-y border-line">
          {preview.prioritySubminimums.map((outcome) => (
            <li key={outcome.key} className="py-3 text-body">
              <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                {outcome.label}
                <Chip tone={outcome.passed === false ? 'danger' : outcome.passed === true ? 'success' : 'neutral'}>
                  {outcome.passed === false ? 'Missed' : outcome.passed === true ? 'Met' : 'Not tested yet'}
                </Chip>
                {outcome.passed === false ? <WhyLink problem="review-below-minimum" /> : null}
              </p>
              <p className="mt-0.5 text-meta text-label">{outcome.explanation}</p>
            </li>
          ))}
        </ul>
        <p className="text-meta text-label">
          Rules: {GENERIC_CODES_USER_LABEL} ({preview.ruleSetKey}, version {preview.ruleSetVersion}).
        </p>
      </MoreOptions>
      </div>
    </Shell>
  )
}

const AREA_DOT: Partial<Record<AreaKey, string>> = {
  applicability: 'bg-icon',
  financial: 'bg-icon',
  ownership: 'bg-el-own',
  management_control: 'bg-el-mc',
  skills_development: 'bg-el-skills',
  preferential_procurement: 'bg-el-esd-pp',
  supplier_development: 'bg-el-esd-sd',
  enterprise_development: 'bg-el-esd-ed',
  socio_economic_development: 'bg-el-sed',
}
