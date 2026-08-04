import Link from 'next/link'
import {
  deleteContributionRecord,
  saveActualNpatInline,
  saveContributionRecord,
  saveEsdBonusFlags,
} from './actions'
import type { LoadedGenericAssessment } from './load'
import {
  AssessmentAside,
  Card,
  Field,
  Flash,
  FormCard,
  IndicatorTable,
  SelectField,
  Shell,
  formatRand,
  type GenericStepSlug,
} from './ui'
import { storedCalculation, workflowForLoaded } from './workflow-context'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import type { EvaluatedContribution } from '@/lib/scorecard/generic/elements/contributions'

type ContributionElementKey =
  | 'enterprise_development'
  | 'supplier_development'
  | 'socio_economic_development'

/** Target as a fraction of applicable NPAT, per the 2019 generic scorecard. */
const TARGET_FRACTION: Record<ContributionElementKey, number> = {
  enterprise_development: 0.01,
  supplier_development: 0.02,
  socio_economic_development: 0.01,
}

const META: Record<
  ContributionElementKey,
  { slug: GenericStepSlug; title: string; subtitle: string; bonusLabel: string | null }
> = {
  enterprise_development: {
    slug: 'enterprise-development',
    title: 'Enterprise Development — 5 points',
    subtitle: 'Target: 1% of applicable NPAT. Use the Annexe 400(B) benefit factor matrix. Raw contribution amounts are never treated as fully recognised.',
    bonusLabel: 'Job creation bonus (1 point)',
  },
  supplier_development: {
    slug: 'supplier-development',
    title: 'Supplier Development — 10 points',
    subtitle: 'Target: 2% of applicable NPAT. Keep this separate from Skills Development. Priority sub-minimum: 40% of 10 points. The orphan workbook row "11% more new jobs" is excluded.',
    bonusLabel: 'Graduation from ED to SD bonus (1 point)',
  },
  socio_economic_development: {
    slug: 'socio-economic-development',
    title: 'Socio-Economic Development — 5 points',
    subtitle: 'Target: 1% of applicable NPAT. Use Annexe 500(A) only (grants/direct costs/overheads/HR capacity). Loans, guarantees and equity are not SED contribution types. Contributions are recognised pro rata to the black beneficiary percentage. The workbook "Claimed" column is preserved as raw optional input and never scored.',
    bonusLabel: null,
  },
}

export function ContributionStep(args: {
  assessmentId: string
  elementKey: ContributionElementKey
  loaded: LoadedGenericAssessment
  searchParams: Record<string, string | string[] | undefined>
}) {
  const meta = META[args.elementKey]
  const { assessment, company, preview, contributions, inputs } = args.loaded
  const element = preview.elements.find((candidate) => candidate.elementKey === args.elementKey)
  const rows = contributions.filter((row) => row.element_key === args.elementKey)
  const isSed = args.elementKey === 'socio_economic_development'

  const applicableNpat = preview.npat.applicableNpat
  const npatResolved = applicableNpat != null && applicableNpat > 0
  const targetFraction = TARGET_FRACTION[args.elementKey]
  const targetAmount = npatResolved ? applicableNpat * targetFraction : null
  // The engine's own recognised total, not a re-derivation from the raw rows.
  const recognised =
    (element as { totalRecognisedValue?: number | null } | undefined)?.totalRecognisedValue ?? null
  const gap =
    targetAmount != null && recognised != null ? Math.max(targetAmount - recognised, 0) : null
  const financialHref = `/scorecards/calculator/${args.assessmentId}/generic/financial`

  // Per-record evaluation, so an excluded contribution says why instead of
  // silently contributing zero.
  const evaluatedById = new Map(
    (
      (element as { evaluatedContributions?: EvaluatedContribution[] } | undefined)
        ?.evaluatedContributions ?? []
    ).map((item) => [item.record.id, item]),
  )
  const bonusConfirmed =
    args.elementKey === 'enterprise_development'
      ? inputs.enterpriseDevelopment.bonusConfirmed
      : args.elementKey === 'supplier_development'
        ? inputs.supplierDevelopment.bonusConfirmed
        : null
  const bonusEvidence =
    args.elementKey === 'enterprise_development'
      ? inputs.enterpriseDevelopment.bonusEvidenceProvided
      : args.elementKey === 'supplier_development'
        ? inputs.supplierDevelopment.bonusEvidenceProvided
        : false
  const workflow = workflowForLoaded(args.loaded, meta.slug)

  return (
    <Shell
      assessmentId={args.assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current={meta.slug}
      title={meta.title}
      subtitle={meta.subtitle}
      workflow={workflow}
      aside={
        <AssessmentAside
          preview={preview}
          workflow={workflow}
          stored={storedCalculation(args.loaded)}
        />
      }
    >
      <Flash searchParams={args.searchParams} />

      {!npatResolved ? (
        <Card title="NPAT required before this element can score">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <strong>NPAT required before this element can score.</strong> {meta.title.split(' — ')[0]} is
            measured as a percentage of applicable NPAT, so without a denominator every contribution
            scores zero no matter how much was contributed.
          </p>
          <p className="text-sm text-slate-700">{preview.npat.reason}</p>
          <form action={saveActualNpatInline} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="assessmentId" value={args.assessmentId} />
            <input type="hidden" name="elementKey" value={args.elementKey} />
            <Field
              label="Actual NPAT (R)"
              name="actualNpat"
              type="number"
              step="0.01"
              defaultValue={args.loaded.inputs.financial.actualNpat}
              hint="Net profit after tax for the measurement period. Saves without affecting your other financial inputs."
            />
            <PendingSubmitButton label="Save NPAT" pendingLabel="Saving…" />
          </form>
          <p className="text-xs text-slate-600">
            Revenue, the industry profit norm and the deemed-NPAT comparison live on the{' '}
            <Link href={financialHref} className="font-medium text-slate-900 underline">
              Financial step
            </Link>
            .
          </p>
        </Card>
      ) : (
        <Card title="Target, contribution and gap">
          <dl className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">
                Target ({(targetFraction * 100).toFixed(0)}% of NPAT)
              </dt>
              <dd className="text-base font-semibold text-slate-950">{formatRand(targetAmount)}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Recognised contribution</dt>
              <dd className="text-base font-semibold text-slate-950">{formatRand(recognised)}</dd>
            </div>
            <div
              className={`rounded-xl px-3 py-2 ${gap != null && gap > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}
            >
              <dt className="text-slate-500">Gap to target</dt>
              <dd className="text-base font-semibold text-slate-950">
                {gap == null ? '—' : gap > 0 ? formatRand(gap) : 'Target met'}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-slate-700">
            Applicable NPAT: <strong>{formatRand(applicableNpat)}</strong> · {preview.npat.reason}
          </p>
          <p className="text-xs text-slate-600">
            Phase 1: every contribution is recognised at 100% of its actual value. The Annexe 400(B) /
            500(A) benefit factor matrix returns in phase 2.
          </p>
        </Card>
      )}

      {element ? (
        <Card title="Current score">
          <IndicatorTable element={element} />
        </Card>
      ) : null}

      <Card title="Contribution records">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No contributions captured yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const evaluatedRow = evaluatedById.get(row.id)
              const excluded = evaluatedRow != null && evaluatedRow.recognisedValue == null
              return (
              <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{row.beneficiary_name ?? 'Unnamed beneficiary'}</p>
                    <p className="mt-1 text-slate-600">
                      Actual {formatRand(Number(row.actual_value))} · Recognised{' '}
                      {evaluatedRow == null ? '—' : formatRand(evaluatedRow.recognisedValue)}
                    </p>
                    {excluded ? (
                      <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-950">
                        Not recognised — scores zero. {evaluatedRow!.eligibilityReason}
                        {evaluatedRow!.record.evidenceProvided
                          ? ''
                          : ' Tick "Supporting evidence has been recorded" to include it.'}
                      </p>
                    ) : null}
                  </div>
                  <form action={deleteContributionRecord}>
                    <input type="hidden" name="assessmentId" value={args.assessmentId} />
                    <input type="hidden" name="elementKey" value={args.elementKey} />
                    <input type="hidden" name="recordId" value={row.id} />
                    <button type="submit" className="text-xs font-medium text-rose-700 hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </Card>

      <FormCard title="Add contribution" action={saveContributionRecord} submitLabel="Add contribution">
          <div className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="assessmentId" value={args.assessmentId} />
          <input type="hidden" name="elementKey" value={args.elementKey} />
          <Field label="Beneficiary name" name="beneficiaryName" />
          {!isSed ? (
            <>
              <SelectField
                label="Beneficiary classification"
                name="beneficiaryClassification"
                options={[
                  { value: '', label: 'Select…' },
                  { value: 'eme', label: 'EME' },
                  { value: 'qse', label: 'QSE' },
                  { value: 'generic', label: 'Generic' },
                ]}
              />
              <Field label="Black ownership %" name="beneficiaryBlackOwnershipPercentage" type="number" step="0.01" hint="Must be at least 51%" />
              <SelectField
                label="Was EME/QSE at first assistance?"
                name="wasEmeOrQseAtFirstAssistance"
                options={[
                  { value: '', label: 'Not captured' },
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
              />
              <Field label="Years since first assistance" name="yearsSinceFirstAssistance" type="number" step="0.1" />
            </>
          ) : (
            <Field
              label="Black beneficiaries %"
              name="blackBeneficiaryPercentage"
              type="number"
              step="0.01"
              hint="Recognised pro rata. 100 = fully black beneficiaries."
            />
          )}
          <Field
            label="Actual value (R)"
            name="actualValue"
            type="number"
            step="0.01"
            hint="Recognised at 100% in phase 1."
          />
          <Field label="Contribution date" name="contributionDate" type="date" />
          <Field label="Notes" name="notes" />
          <label className="flex items-center gap-2 text-sm text-slate-800 sm:col-span-2">
            <input type="checkbox" name="evidenceProvided" className="rounded border-slate-300" />
            Supporting evidence has been recorded
          </label>
          </div>
        </FormCard>

      {meta.bonusLabel ? (
        <FormCard title={meta.bonusLabel} action={saveEsdBonusFlags} submitLabel="Save bonus flags">
          <div className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="assessmentId" value={args.assessmentId} />
            <input type="hidden" name="elementKey" value={args.elementKey} />
            <SelectField
              label="Bonus confirmed?"
              name="bonusConfirmed"
              defaultValue={bonusConfirmed == null ? '' : bonusConfirmed ? 'yes' : 'no'}
              options={[
                { value: '', label: 'Not captured' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input type="checkbox" name="bonusEvidenceProvided" defaultChecked={bonusEvidence} className="rounded border-slate-300" />
              Supporting evidence recorded
            </label>
          </div>
        </FormCard>
      ) : null}
    </Shell>
  )
}
