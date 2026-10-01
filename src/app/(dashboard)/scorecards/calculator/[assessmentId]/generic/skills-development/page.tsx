import { notFound } from 'next/navigation'
import { saveSkillsDevelopmentInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { AssessmentAside, Card, Field, Flash, ElementScore, SelectField, Shell, FormCard } from '../ui'
import { storedCalculation, workflowForLoaded } from '../workflow-context'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function DemoFields(args: {
  prefix: string
  label: string
  values: Record<string, number | undefined>
}) {
  const d = args.values
  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{args.label}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="African male" name={`${args.prefix}AfricanMale`} type="number" step="0.01" defaultValue={d.african_male ?? 0} />
        <Field label="Coloured male" name={`${args.prefix}ColouredMale`} type="number" step="0.01" defaultValue={d.coloured_male ?? 0} />
        <Field label="Indian male" name={`${args.prefix}IndianMale`} type="number" step="0.01" defaultValue={d.indian_male ?? 0} />
        <Field label="African female" name={`${args.prefix}AfricanFemale`} type="number" step="0.01" defaultValue={d.african_female ?? 0} />
        <Field label="Coloured female" name={`${args.prefix}ColouredFemale`} type="number" step="0.01" defaultValue={d.coloured_female ?? 0} />
        <Field label="Indian female" name={`${args.prefix}IndianFemale`} type="number" step="0.01" defaultValue={d.indian_female ?? 0} />
      </div>
    </div>
  )
}

export default async function SkillsDevelopmentPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, inputs } = loaded
  const s = inputs.skillsDevelopment
  const element = preview.elements.find((candidate) => candidate.elementKey === 'skills_development')
  const yesNo = (value: boolean | null) => (value == null ? '' : value ? 'yes' : 'no')
  const workflow = workflowForLoaded(loaded, 'skills-development')

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="skills-development"
      title="Skills development"
      subtitle="Money spent on training black employees and learners, as a share of payroll. Up to 20 points plus 5 bonus. No points count until the three documents below are confirmed."
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

      {element ? (
        <ElementScore element={element} fixHref="#inputs" />
      ) : null}

      <FormCard id="inputs" title="Eligibility and denominators" action={saveSkillsDevelopmentInputs}>
          <div className="space-y-5">
            <input type="hidden" name="assessmentId" value={assessmentId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="SETA-approved WSP / ATR"
              name="wspAtrSetaApproved"
              defaultValue={yesNo(s.wspAtrSetaApproved)}
              hint="Gate: no Skills Development points until confirmed."
              options={[
                { value: '', label: 'Not confirmed' },
                { value: 'yes', label: 'Confirmed' },
                { value: 'no', label: 'Not approved' },
              ]}
            />
            <SelectField
              label="Pivotal report submitted"
              name="pivotalReportSubmitted"
              defaultValue={yesNo(s.pivotalReportSubmitted)}
              hint="Gate: no Skills Development points until confirmed."
              options={[
                { value: '', label: 'Not confirmed' },
                { value: 'yes', label: 'Confirmed' },
                { value: 'no', label: 'Not submitted' },
              ]}
            />
            <SelectField
              label="Priority skills programme implemented"
              name="prioritySkillsProgrammeImplemented"
              defaultValue={yesNo(s.prioritySkillsProgrammeImplemented)}
              hint="Gate: no Skills Development points until confirmed."
              options={[
                { value: '', label: 'Not confirmed' },
                { value: 'yes', label: 'Confirmed' },
                { value: 'no', label: 'Not implemented' },
              ]}
            />
            <SelectField
              label="Trainee tracking register maintained"
              name="trainingRegisterMaintained"
              defaultValue={yesNo(s.trainingRegisterMaintained)}
              hint="Bonus condition only: affects the 5-point absorption bonus, never the 20 base points."
              options={[
                { value: '', label: 'Not confirmed' },
                { value: 'yes', label: 'Confirmed' },
                { value: 'no', label: 'Not maintained' },
              ]}
            />
            <Field label="Leviable amount (R)" name="leviableAmount" type="number" step="0.01" defaultValue={s.leviableAmount} />
            <Field label="Total employees" name="totalEmployees" type="number" step="1" defaultValue={s.totalEmployees} />
            <Field label="Total skills development spend (R)" name="totalSkillsDevelopmentSpend" type="number" step="0.01" defaultValue={s.totalSkillsDevelopmentSpend} />
            <Field label="Informal / F&G spend (R)" name="informalWorkplaceLearningSpend" type="number" step="0.01" defaultValue={s.informalWorkplaceLearningSpend} hint="Capped at 15% of total spend" />
            <Field label="Training administration cost (R)" name="trainingAdministrationCost" type="number" step="0.01" defaultValue={s.trainingAdministrationCost} hint="Capped at 15% of total spend" />
            <Field label="Disability training spend (R)" name="disabilityTrainingSpend" type="number" step="0.01" defaultValue={s.disabilityTrainingSpend} />
            <Field label="Learners completed" name="learnersCompleted" type="number" step="1" defaultValue={s.learnersCompleted} />
            <Field label="Learners absorbed" name="learnersAbsorbed" type="number" step="1" defaultValue={s.learnersAbsorbed} />
          </div>
          <DemoFields prefix="general" label="General black skills expenditure by EAP band (R)" values={s.generalTrainingSpendByDemographic} />
          <DemoFields prefix="bursary" label="Black student bursaries by EAP band (R)" values={s.bursarySpendByDemographic} />
          <DemoFields prefix="learner" label="Black learners / apprentices / interns by EAP band" values={s.learnerHeadcountByDemographic} />
          </div>
        </FormCard>
    </Shell>
  )
}
