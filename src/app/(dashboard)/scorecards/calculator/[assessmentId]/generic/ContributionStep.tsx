import {
  deleteContributionRecord,
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
import { ESD_BENEFIT_FACTORS, SED_BENEFIT_FACTORS } from '@/lib/scorecard/generic/benefit-factors'

type ContributionElementKey =
  | 'enterprise_development'
  | 'supplier_development'
  | 'socio_economic_development'

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
  const factors = args.elementKey === 'socio_economic_development' ? SED_BENEFIT_FACTORS : ESD_BENEFIT_FACTORS
  const isSed = args.elementKey === 'socio_economic_development'
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

      <Card title="Applicable NPAT">
        <p className="text-sm text-slate-700">
          Denominator: <strong>{formatRand(preview.npat.applicableNpat)}</strong> · {preview.npat.reason}
        </p>
      </Card>

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
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{row.beneficiary_name ?? 'Unnamed beneficiary'}</p>
                    <p className="mt-1 text-slate-600">
                      {row.contribution_type ?? 'No type'} · Actual {formatRand(Number(row.actual_value))}
                      {row.claimed_raw ? ` · Claimed (raw, unscored): ${row.claimed_raw}` : ''}
                    </p>
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
            ))}
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
          <SelectField
            label="Contribution type"
            name="contributionType"
            options={[
              { value: '', label: 'Select…' },
              ...factors.map((factor) => ({ value: factor.key, label: `${factor.label}${factor.kind === 'variable' ? ' (rate-based)' : ` · ${((factor.factor ?? 0) * 100).toFixed(0)}%`}` })),
            ]}
          />
          <Field label="Actual value (R)" name="actualValue" type="number" step="0.01" />
          <Field label="Supplied benefit factor (rate-based only)" name="suppliedBenefitFactor" type="number" step="0.01" hint="Required for variable matrix rows" />
          <Field label="Contribution date" name="contributionDate" type="date" />
          <Field label="Notes" name="notes" />
          {isSed ? <Field label="Claimed (raw, unscored)" name="claimedRaw" hint="Preserved verbatim. Never used in scoring until REAP confirms its meaning." /> : null}
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
