import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadGenericAssessment } from './load'
import { Card, Flash, ResultSummary, Shell, formatPoints } from './ui'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function GenericOverviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, elements } = loaded
  const base = `/scorecards/calculator/${assessmentId}/generic`

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current=""
      title="Generic scorecard workspace"
      subtitle="Capture applicability and shared financial inputs, complete every element, attach a frozen procurement assessment, then run an explicit calculation. A final B-BBEE level is only shown when the Generic Codes apply and every required input is complete."
      aside={
        <ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />
      }
    >
      <Flash searchParams={query} />

      <Card title="Guided steps">
        <ol className="grid gap-2 sm:grid-cols-2">
          {[
            ['applicability', '1. Applicability gate'],
            ['financial', '2. Shared financial inputs'],
            ['ownership', '3. Ownership'],
            ['management-control', '4. Management Control'],
            ['skills-development', '5. Skills Development'],
            ['procurement', '6. Procurement attachment'],
            ['enterprise-development', '7. Enterprise Development'],
            ['supplier-development', '8. Supplier Development'],
            ['socio-economic-development', '9. Socio-Economic Development'],
            ['review', '10. Review and calculate'],
            ['result', '11. Final result'],
          ].map(([slug, label]) => (
            <li key={slug}>
              <Link
                href={`${base}/${slug}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 hover:border-[#063b3f]/40"
              >
                <span>{label}</span>
                <span className="text-slate-400">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Element status">
        <div className="grid gap-3">
          {preview.elements.map((element) => {
            const stored = elements.find((row) => row.element_key === element.elementKey)
            return (
              <div
                key={element.elementKey}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">{element.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {element.status.replace(/_/g, ' ')}
                    {stored?.status === 'needs_review' ? ' · import awaiting review' : ''}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-slate-950">
                    {formatPoints(element.basePointsAchieved)}
                    <span className="text-xs font-normal text-slate-400">
                      {' '}
                      / {formatPoints(element.basePointsAvailable)} base
                    </span>
                  </p>
                  {element.bonusPointsAvailable > 0 ? (
                    <p className="text-xs text-slate-500">
                      +{formatPoints(element.bonusPointsAchieved)} bonus
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Rule set">
        <p className="text-sm text-slate-700">
          Operative rule set: <strong>{preview.ruleSetDisplayName}</strong> ({preview.ruleSetKey} v
          {preview.ruleSetVersion}). The reserved 2026 draft cannot produce a final level.
        </p>
        <p className="text-sm text-slate-600">
          This product is an internal scorecard calculator and readiness tool. Results remain subject
          to evidence review and authorised verification. It does not issue a B-BBEE certificate.
        </p>
      </Card>
    </Shell>
  )
}
