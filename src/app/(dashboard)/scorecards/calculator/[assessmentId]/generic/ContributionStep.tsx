import Link from 'next/link'
import { HandCoins } from 'lucide-react'
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
  EVIDENCE_ATTESTATION_HELP,
  EVIDENCE_CONFIRM_LABEL,
  EVIDENCE_CORRECT_LABEL,
  EVIDENCE_REFERENCE_EXAMPLE,
  EVIDENCE_REFERENCE_HINT_REQUIRED,
  EVIDENCE_REFERENCE_SOURCE,
  MAX_EVIDENCE_REFERENCE_LENGTH,
} from './evidence-copy'
import type { LoadedGenericAssessment } from './load'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { Term } from '@/components/ui/Term'
import { HelpLink, WhyLink } from '@/components/help/HelpLink'
import { PageHelpData } from '@/components/help/PageHelpData'
import type { ContributionHelpData } from '@/content/page-help'
import { Field, Flash, FormCard, SelectField, Shell, formatRand, type GenericStepSlug } from './ui'
import { workflowForLoaded, workspaceFor } from './workflow-context'
import { AutoSaveForm } from './AutoSaveForm'
import { AreaIntro } from './workspace'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { buttonStyles } from '@/components/ui/buttonStyles'
import type { EvaluatedContribution } from '@/lib/scorecard/generic/elements/contributions'

type ContributionElementKey =
  | 'enterprise_development'
  | 'supplier_development'
  | 'socio_economic_development'

/** Where the engine reports each area's target amount (contributionTargets). */
const TARGET_KEY = {
  enterprise_development: 'enterpriseDevelopment',
  supplier_development: 'supplierDevelopment',
  socio_economic_development: 'socioEconomicDevelopment',
} as const

type BonusHelp = {
  /** What a Yes means, in one line. */
  explain: string
  /** Where the proof is, shown as "Find it in …". */
  source: string
  example: string
}

const META: Record<
  ContributionElementKey,
  {
    slug: GenericStepSlug
    title: string
    subtitle: string
    bonusLabel: string | null
    /** This page's key in content/page-help.ts. */
    helpKey: 'area-enterprise-development' | 'area-supplier-development' | 'area-socio-economic-development'
    /** Realistic examples for the Add contribution fields. */
    examples: { beneficiary: string; value: string; notes: string }
    bonusHelp: BonusHelp | null
  }
> = {
  enterprise_development: {
    slug: 'enterprise-development',
    title: 'Enterprise development',
    subtitle: `${AREA_COPY.enterprise_development.measures} Each contribution counts once its evidence is confirmed.`,
    bonusLabel: 'Job creation bonus (1 point)',
    helpKey: 'area-enterprise-development',
    examples: { beneficiary: 'Ikhwezi Catering CC', value: '120 000', notes: 'Start-up grant for kitchen equipment' },
    // TODO-VERIFY: the plain meaning of the job creation bonus, where its evidence is found, and whether the codes set a minimum number of jobs.
    bonusHelp: {
      explain: 'Yes when your enterprise and supplier development work created new jobs at the businesses you supported.',
      source: 'the beneficiaries’ payroll or employment records',
      example: 'Yes: Ikhwezi Catering took on three new staff after the grant',
    },
  },
  supplier_development: {
    slug: 'supplier-development',
    title: 'Supplier development',
    subtitle: `${AREA_COPY.supplier_development.measures} Each contribution counts once its evidence is confirmed.`,
    bonusLabel: 'Graduation bonus: from enterprise to supplier development (1 point)',
    helpKey: 'area-supplier-development',
    examples: {
      beneficiary: 'Masakhane Plumbing (Pty) Ltd',
      value: '250 000',
      notes: 'Second year of a three-year mentorship and equipment grant',
    },
    // TODO-VERIFY: the plain meaning of the graduation bonus, where its evidence is found, and the example.
    bonusHelp: {
      explain:
        'Yes when at least one business you supported through enterprise development has grown to supplier development level.',
      source: 'the earlier enterprise development agreement and the current supplier agreement or purchase orders',
      example: 'Yes: a catering business you mentored now supplies your canteen',
    },
  },
  socio_economic_development: {
    slug: 'socio-economic-development',
    title: 'Socio-economic development',
    subtitle: `${AREA_COPY.socio_economic_development.measures} Grants, bursaries or direct costs count; loans and equity do not. Each contribution counts in proportion to its black beneficiaries, once its evidence is confirmed.`,
    bonusLabel: null,
    helpKey: 'area-socio-economic-development',
    examples: {
      beneficiary: 'Thembalethu Community Crèche',
      value: '80 000',
      notes: 'Monthly grant for meals and learning materials',
    },
    bonusHelp: null,
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
  // The engine's own target, and the share of profit it is, worked out from it.
  const targetAmount = npatResolved ? (preview.contributionTargets[TARGET_KEY[args.elementKey]] ?? null) : null
  const targetShare = targetAmount != null && npatResolved ? Number(((targetAmount / applicableNpat) * 100).toFixed(2)) : null
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
  const workspace = workspaceFor(args.loaded, workflow, args.elementKey)
  const pageHref = `/scorecards/calculator/${args.assessmentId}/generic/${meta.slug}`

  // Page help: counts and links this page already has, for the help panel's "next".
  const helpData: ContributionHelpData = {
    pageHref,
    npatResolved,
    contributions: rows.length,
    needEvidence: rows.filter((row) => !row.evidence_provided).length,
    notCounted: rows.filter((row) => row.evidence_provided && evaluatedById.get(row.id)?.recognisedValue == null).length,
    gap: gap != null && gap > 0 ? formatRand(gap) : null,
    bonusAnswered: meta.bonusLabel ? bonusConfirmed != null : null,
    next: workspace.next ? { label: workspace.next.label, href: workspace.next.href } : null,
    reviewHref: workspace.reviewHref,
  }

  return (
    <Shell
      assessmentId={args.assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current={meta.slug}
      title={meta.title}
      subtitle={meta.subtitle}
      workflow={workflow}
      workspace={workspace}
    >
      <PageHelpData page={meta.helpKey} data={helpData} />
      <Flash searchParams={args.searchParams} />

      {!npatResolved ? (
        <Card
          id="npat"
          data-help="contribution-target"
          bodyClassName="space-y-4"
          title={
            <>
              Profit after tax (<Term k="npat">NPAT</Term>) is needed before this area can score
            </>
          }
        >
          <p className="rounded-control bg-warn-soft px-3 py-2 text-body text-warn">
            {meta.title.split(' — ')[0]} is measured as a percentage of applicable NPAT, so without a
            denominator every contribution scores zero no matter how much was contributed.
          </p>
          <p className="text-body text-ink">{preview.npat.reason}</p>
          <form action={saveActualNpatInline} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="assessmentId" value={args.assessmentId} />
            <input type="hidden" name="elementKey" value={args.elementKey} />
            <Field
              label="Actual NPAT (R)"
              name="actualNpat"
              type="number"
              step="0.01"
              defaultValue={args.loaded.inputs.financial.actualNpat}
              explain="Net profit after tax for the measurement period, in rand. Enter a loss as a minus figure."
              source="the signed annual financial statements (the income statement)"
              example="2450000"
              hint="Saves without affecting your other financial inputs."
            />
            <PendingSubmitButton label="Save NPAT" pendingLabel="Saving…" />
          </form>
          <p className="text-meta text-label">
            Made a loss or a very small profit? Enter revenue and the industry profit norm on{' '}
            <Link href={financialHref} className="font-medium text-ink underline">
              Financial figures
            </Link>
            : the app then compares actual and <Term k="deemedNpat">deemed NPAT</Term> and uses the higher.
          </p>
        </Card>
      ) : (
        <Card id="npat" data-help="contribution-target" bodyClassName="space-y-4" title="Target, contribution and gap">
          <dl className="grid gap-3 sm:grid-cols-3 text-body">
            <div className="rounded-control bg-sunken px-3 py-2">
              <dt className="text-label">
                Target{targetShare != null ? ` (${targetShare}% of profit after tax)` : ''}
              </dt>
              <dd className="text-body font-semibold text-ink">{formatRand(targetAmount)}</dd>
            </div>
            <div className="rounded-control bg-sunken px-3 py-2">
              <dt className="text-label">Recognised contribution</dt>
              <dd className="text-body font-semibold text-ink">{formatRand(recognised)}</dd>
            </div>
            <div
              className={`rounded-xl px-3 py-2 ${gap != null && gap > 0 ? 'bg-warn-soft' : 'bg-ok-soft'}`}
            >
              <dt className="text-label">Gap to target</dt>
              <dd className="text-body font-semibold text-ink">
                {gap == null ? '—' : gap > 0 ? formatRand(gap) : 'Target met'}
              </dd>
            </div>
          </dl>
          <p className="text-body text-ink">
            Applicable <Term k="npat">NPAT</Term>: <strong>{formatRand(applicableNpat)}</strong> · {preview.npat.reason}
          </p>
          <p className="text-meta text-label">
            Every contribution is counted as a grant, at its full amount (a <Term k="benefitFactor">benefit factor</Term> of
            100%). Other kinds of contribution, which the codes count at different rates, are not in the app yet.
          </p>
        </Card>
      )}

      <AreaIntro areaKey={args.elementKey} preview={preview} company={company.name} />

      <Card
        id="inputs"
        data-help="contribution-list"
        bodyClassName="space-y-4"
        title="Contributions"
        description={
          rows.length > 0 ? (
            <>
              Each one counts only once its <Term k="evidence">supporting evidence</Term> is confirmed.
            </>
          ) : undefined
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={<HandCoins aria-hidden />}
            title="No contributions yet"
            action={
              <Link href="#add-contribution" className={buttonStyles({ variant: 'secondary' })}>
                Add a contribution
              </Link>
            }
          >
            <p>
              Add each {isSed ? 'grant, bursary or donation' : 'grant, cost or other help'} given in the year, with its
              value and an evidence reference.
            </p>
            <HelpLink />
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const evaluatedRow = evaluatedById.get(row.id)
              const excluded = evaluatedRow != null && evaluatedRow.recognisedValue == null
              return (
              <div key={row.id} className="rounded-control border border-line bg-sunken px-4 py-3 text-body">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{row.beneficiary_name ?? 'Unnamed beneficiary'}</p>
                    <p className="mt-1 text-label">
                      Actual {formatRand(Number(row.actual_value))} · Recognised{' '}
                      {evaluatedRow == null ? '—' : formatRand(evaluatedRow.recognisedValue)}
                    </p>
                    {excluded ? (
                      <div className="mt-2 rounded-control bg-warn-soft px-2 py-1 text-body text-warn">
                        <p className="flex flex-wrap items-baseline gap-x-2 font-medium">
                          Not recognised — scores zero.
                          <WhyLink problem={`${meta.helpKey}-not-recognised`} />
                        </p>
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
                      <div className="mt-2 rounded-control bg-ok-soft px-3 py-2 text-body text-ok">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          Supporting evidence confirmed
                          {/* The marker, not the history: a reviewer sees at a
                              glance that this reference was amended, and the
                              previous value and reason live in the audit trail. */}
                          {row.evidence_reference_corrected_at ? (
                            <Chip tone="attention">Reference corrected</Chip>
                          ) : null}
                        </p>
                        <p className="mt-0.5">
                          Reference:{' '}
                          <span className="font-medium">
                            {row.evidence_reference?.trim() || 'Legacy confirmation — reference not recorded'}
                          </span>
                        </p>
                        {row.evidence_reference_corrected_at ? (
                          <p className="mt-0.5 text-ok">
                            This reference was corrected after it was first confirmed. The previous
                            reference and the reason given are kept in the audit trail.
                          </p>
                        ) : null}
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium text-ok underline">
                            {EVIDENCE_CORRECT_LABEL}
                          </summary>
                          <form
                            action={correctContributionEvidenceReference}
                            className="mt-2 space-y-2 rounded-control border border-ok/30 bg-surface p-3"
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
                              source={EVIDENCE_REFERENCE_SOURCE}
                              example={EVIDENCE_REFERENCE_EXAMPLE}
                              hint={EVIDENCE_REFERENCE_HINT_REQUIRED}
                            />
                            <Field
                              label="Reason for the correction"
                              name="correctionReason"
                              required
                              maxLength={MAX_EVIDENCE_REFERENCE_LENGTH}
                              explain="Required. Say why the recorded reference was wrong. Kept in the audit trail."
                              example="The purchase order number was entered instead of the invoice number"
                            />
                            <p className="text-label">
                              The contribution stays confirmed and its score does not change. Only the
                              reference is amended.
                            </p>
                            <PendingSubmitButton
                              label="Save corrected reference"
                              pendingLabel="Saving…"
                              variant="primary"
                            />
                          </form>
                        </details>
                      </div>
                    ) : (
                      <form action={confirmContributionEvidence} className="mt-3 space-y-2 rounded-control border border-warn/30 bg-surface p-3">
                        <input type="hidden" name="assessmentId" value={args.assessmentId} />
                        <input type="hidden" name="elementKey" value={args.elementKey} />
                        <input type="hidden" name="recordId" value={row.id} />
                        <Field
                          label="Evidence reference"
                          name="evidenceReference"
                          required
                          maxLength={MAX_EVIDENCE_REFERENCE_LENGTH}
                          source={EVIDENCE_REFERENCE_SOURCE}
                          example={EVIDENCE_REFERENCE_EXAMPLE}
                          hint={EVIDENCE_REFERENCE_HINT_REQUIRED}
                        />
                        <label className="flex min-h-11 items-start gap-2 py-2 text-body text-ink">
                          <input
                            type="checkbox"
                            name="evidenceReviewed"
                            required
                            className="mt-0.5 rounded border-line-strong"
                          />
                          <span>
                            {EVIDENCE_ATTESTATION}
                            <span className="mt-0.5 block text-meta text-label">{EVIDENCE_ATTESTATION_HELP}</span>
                          </span>
                        </label>
                        <PendingSubmitButton
                          label={EVIDENCE_CONFIRM_LABEL}
                          pendingLabel="Confirming…"
                          variant="primary"
                        />
                      </form>
                    )}
                  </div>
                  <form action={deleteContributionRecord}>
                    <input type="hidden" name="assessmentId" value={args.assessmentId} />
                    <input type="hidden" name="elementKey" value={args.elementKey} />
                    <input type="hidden" name="recordId" value={row.id} />
                    <button type="submit" className="-my-3 inline-flex min-h-11 min-w-11 items-center text-body font-medium text-danger hover:underline sm:my-0 sm:min-h-0 sm:min-w-0">
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

      {/* FormCard takes no data-help or id, so a plain wrapper carries them. */}
      <div id="add-contribution" data-help="contribution-add" className="scroll-mt-6">
        <FormCard title="Add contribution" action={saveContributionRecord} submitLabel="Add contribution">
          <div className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="assessmentId" value={args.assessmentId} />
            <input type="hidden" name="elementKey" value={args.elementKey} />
            <Field
              label="Beneficiary name"
              name="beneficiaryName"
              explain={isSed ? 'The project or organisation that received it.' : 'The business that received it.'}
              source="the signed agreement"
              example={meta.examples.beneficiary}
            />
            {!isSed ? (
              <>
                <SelectField
                  label="Beneficiary classification"
                  name="beneficiaryClassification"
                  hint={
                    <>
                      The beneficiary’s size: <Term k="eme">EME</Term> (turnover up to R10 million),{' '}
                      <Term k="qse">QSE</Term> (up to R50 million) or <Term k="generic">Generic</Term> (above R50
                      million). Find it on the beneficiary’s B-BBEE certificate or sworn affidavit. For example: EME.
                    </>
                  }
                  options={[
                    { value: '', label: 'Select…' },
                    { value: 'eme', label: 'EME' },
                    { value: 'qse', label: 'QSE' },
                    { value: 'generic', label: 'Generic' },
                  ]}
                />
                <Field
                  label="Black ownership %"
                  name="beneficiaryBlackOwnershipPercentage"
                  type="number"
                  step="0.01"
                  explain="The share of the beneficiary owned by black people, from 0 to 100."
                  source="the beneficiary’s B-BBEE certificate or sworn affidavit"
                  example="60"
                  hint="Must be at least 51%, or the contribution does not count."
                />
                {/* TODO-VERIFY: where to find the first-assistance facts ("the first agreement or first payment to the beneficiary"). */}
                <SelectField
                  label="Was EME/QSE at first assistance?"
                  name="wasEmeOrQseAtFirstAssistance"
                  hint="Only matters for a Generic beneficiary: it counts only if it was an EME or QSE when the company first helped it. Find it in the first agreement with the beneficiary and its certificate or affidavit from that time. For example: Yes."
                  options={[
                    { value: '', label: 'Not captured' },
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ]}
                />
                <Field
                  label="Years since first assistance"
                  name="yearsSinceFirstAssistance"
                  type="number"
                  step="0.1"
                  explain="How long ago the company first helped this beneficiary, in years."
                  source="the date of the first agreement or first payment"
                  example="2.5"
                  hint="Only matters for a Generic beneficiary: more than 5 years and it no longer counts."
                />
              </>
            ) : (
              <>
                {/* TODO-VERIFY: where to find the share of black beneficiaries ("the beneficiary organisation’s letter or register"). */}
                <Field
                  label="Black beneficiaries %"
                  name="blackBeneficiaryPercentage"
                  type="number"
                  step="0.01"
                  explain="The share of the people helped who are black, from 0 to 100."
                  source="the beneficiary organisation’s letter or register of the people it helps"
                  example="85"
                  hint="Counts in proportion: at 85, 85% of the value counts. 100 counts it in full."
                />
              </>
            )}
            <Field
              label="Actual value (R)"
              name="actualValue"
              type="number"
              step="0.01"
              explain="The amount given or spent, in rand."
              source="the proof of payment or the invoice"
              example={`${meta.examples.value.replace(/\s/g, '')} for R ${meta.examples.value}`}
              hint={
                <>
                  Counted at its full amount (a <Term k="benefitFactor">benefit factor</Term> of 100%).
                </>
              }
            />
            {/* TODO-VERIFY: that the contribution date should fall inside the measurement period (the engine does not use the date). */}
            <Field
              label="Contribution date"
              name="contributionDate"
              type="date"
              explain="When it was paid or given. It should fall inside the measurement period; the app does not check this."
              source="the proof of payment"
              example="15 March 2025"
            />
            <Field
              label="Notes"
              name="notes"
              explain="Optional. Anything the verifier should know about this contribution."
              example={meta.examples.notes}
            />
            <AddContributionEvidenceFields />
          </div>
        </FormCard>
      </div>

      {meta.bonusLabel && meta.bonusHelp ? (
        <section id="bonus" data-help="contribution-bonus" className="scroll-mt-6 rounded-card border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-section font-semibold text-ink">{meta.bonusLabel}</h2>
          <p className="mb-4 mt-1 text-meta text-label">
            A <Term k="bonusPoints">bonus point</Term> on top of this area’s points. It does not count towards the
            priority minimum.
          </p>
          <AutoSaveForm action={saveEsdBonusFlags}>
            <input type="hidden" name="assessmentId" value={args.assessmentId} />
            <input type="hidden" name="elementKey" value={args.elementKey} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Does the bonus apply?"
                name="bonusConfirmed"
                defaultValue={bonusConfirmed == null ? '' : bonusConfirmed ? 'yes' : 'no'}
                hint={
                  <>
                    {meta.bonusHelp.explain} Find it in {meta.bonusHelp.source}. For example: {meta.bonusHelp.example}.
                    <span className="mt-0.5 block">Answer either way: the area is not finished until this is answered.</span>
                  </>
                }
                options={[
                  { value: '', label: 'Not answered' },
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
              />
              <label className="flex min-h-11 items-start gap-2 py-2 text-body text-ink">
                <input
                  type="checkbox"
                  name="bonusEvidenceProvided"
                  defaultChecked={bonusEvidence}
                  className="mt-0.5 rounded border-line-strong"
                />
                <span>
                  Supporting evidence recorded
                  <span className="mt-0.5 block text-meta text-label">
                    Tick once you hold the proof. A Yes without this tick gives no bonus point.
                  </span>
                </span>
              </label>
            </div>
          </AutoSaveForm>
        </section>
      ) : (
        <div
          data-help="contribution-done"
          className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <p className="text-body text-label">When every contribution above is in and confirmed, move on.</p>
          <Link href={workspace.next?.href ?? workspace.reviewHref} className={buttonStyles({ variant: 'primary' })}>
            {workspace.next ? 'Done, next area' : 'Review my scorecard'}
          </Link>
        </div>
      )}
    </Shell>
  )
}
