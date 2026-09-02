import Link from 'next/link'
import {
  confirmContributionEvidence,
  correctContributionEvidenceReference,
  deleteContributionRecord,
  saveActualNpatInline,
  saveContributionRecord,
  saveEsdBonusFlags,
} from './actions'
import { AddContributionEvidenceFields } from './AddContributionEvidenceFields'
import {
  EVIDENCE_ATTESTATION,
  EVIDENCE_CONFIRM_LABEL,
  EVIDENCE_CORRECT_LABEL,
  EVIDENCE_REFERENCE_HINT_REQUIRED,
  MAX_EVIDENCE_REFERENCE_LENGTH,
} from './evidence-copy'
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
    subtitle:
      'Target: 1% of applicable NPAT. Phase 1: every contribution is recognised at 100% of its actual value. The Annexe 400(B) benefit factor matrix — which recognises loans, guarantees and other non-grant contributions at less than their full value — returns in phase 2.',
    bonusLabel: 'Job creation bonus (1 point)',
  },
  supplier_development: {
    slug: 'supplier-development',
    title: 'Supplier Development — 10 points',
    subtitle:
      'Target: 2% of applicable NPAT. Keep this separate from Skills Development. Priority sub-minimum: 40% of 10 points. Phase 1: every contribution is recognised at 100% of its actual value; the Annexe 400(B) benefit factor matrix returns in phase 2. The orphan workbook row "11% more new jobs" is excluded.',
    bonusLabel: 'Graduation from ED to SD bonus (1 point)',
  },
  socio_economic_development: {
    slug: 'socio-economic-development',
    title: 'Socio-Economic Development — 5 points',
    subtitle:
      'Target: 1% of applicable NPAT. Only Annexe 500(A) contributions qualify — grants, direct costs, overheads and HR capacity; loans, guarantees and equity do not. Contributions are recognised pro rata to the black beneficiary percentage. Phase 1: every qualifying contribution is recognised at 100% of its actual value, with the Annexe 500(A) benefit factor matrix returning in phase 2.',
    bonusLabel: null,
  },
}

/**
 * Name only the gate(s) that actually blocked recognition.
 *
 * `evaluateContribution` withholds a recognised value when any of four
 * conditions fail (see elements/contributions.ts). Reporting a passing check
 * inside a failure message sends the user to change the wrong field, so the
 * eligibility reason is surfaced only when eligibility is what failed.
 */
function blockingReasons(item: EvaluatedContribution, isSed: boolean): string[] {
  const reasons: string[] = []
  if (!item.record.evidenceProvided) {
    // Name the control that is actually on this row. Confirming evidence for an
    // existing contribution happens through the per-record form below, not the
    // checkbox on "Add contribution".
    reasons.push(
      `Supporting evidence has not been recorded — use "${EVIDENCE_CONFIRM_LABEL}" below and tick "${EVIDENCE_ATTESTATION}"`,
    )
  }
  if (!item.eligible) {
    const field = isSed
      ? 'Check "Black beneficiaries %".'
      : 'Check "Beneficiary classification", "Black ownership %" and the first-assistance fields.'
    reasons.push(`${item.eligibilityReason} ${field}`)
  }
  if (item.record.actualValue == null) {
    reasons.push('No actual value has been captured — enter "Actual value (R)".')
  }
  if (item.benefitFactor == null) {
    reasons.push('The benefit factor could not be resolved for this contribution. Contact REAP support.')
  }
  return reasons
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
            {meta.title.split(' — ')[0]} is measured as a percentage of applicable NPAT, so without a
            denominator every contribution scores zero no matter how much was contributed.
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
                      <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-950">
                        <p className="font-medium">Not recognised — scores zero.</p>
                        {(() => {
                          const reasons = blockingReasons(evaluatedRow!, isSed)
                          if (reasons.length === 0) {
                            return <p className="mt-0.5">This contribution could not be recognised.</p>
                          }
                          if (reasons.length === 1) return <p className="mt-0.5">{reasons[0]}</p>
                          return (
                            <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                              {reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          )
                        })()}
                      </div>
                    ) : null}
                    {row.evidence_provided ? (
                      <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          Supporting evidence confirmed
                          {/* The marker, not the history: a reviewer sees at a
                              glance that this reference was amended, and the
                              previous value and reason live in the audit trail. */}
                          {row.evidence_reference_corrected_at ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                              Reference corrected
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5">
                          Reference:{' '}
                          <span className="font-medium">
                            {row.evidence_reference?.trim() || 'Legacy confirmation — reference not recorded'}
                          </span>
                        </p>
                        {row.evidence_reference_corrected_at ? (
                          <p className="mt-0.5 text-emerald-900">
                            This reference was corrected after it was first confirmed. The previous
                            reference and the reason given are kept in the audit trail.
                          </p>
                        ) : null}
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium text-emerald-900 underline">
                            {EVIDENCE_CORRECT_LABEL}
                          </summary>
                          <form
                            action={correctContributionEvidenceReference}
                            className="mt-2 space-y-2 rounded-lg border border-emerald-200 bg-white p-3"
                          >
                            <input type="hidden" name="assessmentId" value={args.assessmentId} />
                            <input type="hidden" name="elementKey" value={args.elementKey} />
                            <input type="hidden" name="recordId" value={row.id} />
                            <Field
                              label="Corrected evidence reference"
                              name="correctedEvidenceReference"
                              required
                              maxLength={MAX_EVIDENCE_REFERENCE_LENGTH}
                              defaultValue={row.evidence_reference ?? ''}
                              hint={EVIDENCE_REFERENCE_HINT_REQUIRED}
                            />
                            <Field
                              label="Reason for the correction"
                              name="correctionReason"
                              required
                              maxLength={MAX_EVIDENCE_REFERENCE_LENGTH}
                              hint="Required. Say why the recorded reference was wrong. Kept in the audit trail."
                            />
                            <p className="text-slate-600">
                              The contribution stays confirmed and its score does not change. Only the
                              reference is amended.
                            </p>
                            <PendingSubmitButton
                              label="Save corrected reference"
                              pendingLabel="Saving…"
                              className="inline-flex items-center justify-center rounded-lg bg-[#063b3f] px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-80"
                            />
                          </form>
                        </details>
                      </div>
                    ) : (
                      <form action={confirmContributionEvidence} className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-white p-3">
                        <input type="hidden" name="assessmentId" value={args.assessmentId} />
                        <input type="hidden" name="elementKey" value={args.elementKey} />
                        <input type="hidden" name="recordId" value={row.id} />
                        <Field
                          label="Evidence reference"
                          name="evidenceReference"
                          required
                          maxLength={MAX_EVIDENCE_REFERENCE_LENGTH}
                          hint={EVIDENCE_REFERENCE_HINT_REQUIRED}
                        />
                        <label className="flex items-start gap-2 text-xs text-slate-800">
                          <input
                            type="checkbox"
                            name="evidenceReviewed"
                            required
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span>{EVIDENCE_ATTESTATION}</span>
                        </label>
                        <PendingSubmitButton
                          label={EVIDENCE_CONFIRM_LABEL}
                          pendingLabel="Confirming…"
                          className="inline-flex items-center justify-center rounded-lg bg-[#063b3f] px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-80"
                        />
                      </form>
                    )}
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
          <AddContributionEvidenceFields />
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
