import { notFound } from 'next/navigation'
import { saveSkillsDevelopmentInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { Field, Flash, IndicatorTable, SelectField, Shell } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaIntro, AreaSection, sectionWorth } from '../workspace'
import { sameAsWorkbook, workbookReading, workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Panel'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const GROUPS = [
  { suffix: 'AfricanMale', key: 'african_male', label: 'African men' },
  { suffix: 'ColouredMale', key: 'coloured_male', label: 'Coloured men' },
  { suffix: 'IndianMale', key: 'indian_male', label: 'Indian men' },
  { suffix: 'AfricanFemale', key: 'african_female', label: 'African women' },
  { suffix: 'ColouredFemale', key: 'coloured_female', label: 'Coloured women' },
  { suffix: 'IndianFemale', key: 'indian_female', label: 'Indian women' },
] as const

function at(source: unknown, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined), source)
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
  const reading = workbookReading(loaded)?.skillsDevelopment
  const tag = (...path: string[]) => sameAsWorkbook(at(reading, path), at(s, path))

  const byGroup = (
    prefix: string,
    key: 'generalTrainingSpendByDemographic' | 'bursarySpendByDemographic' | 'learnerHeadcountByDemographic',
    unit: 'rand' | 'people',
  ) => (
    <div className="grid gap-3 rounded-control border border-line bg-sunken p-4 sm:col-span-2 sm:grid-cols-3">
      {GROUPS.map((group) => (
        <Field
          key={group.key}
          label={unit === 'rand' ? `${group.label} (R)` : group.label}
          name={`${prefix}${group.suffix}`}
          type="number"
          step={unit === 'rand' ? '0.01' : '1'}
          defaultValue={s[key][group.key] ?? 0}
          fromWorkbook={tag(key, group.key)}
        />
      ))}
    </div>
  )

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="skills-development"
      title="Skills development"
      subtitle={AREA_COPY.skills_development.measures}
      workflow={workflow}
      workspace={workspaceFor(loaded, workflow, 'skills_development')}
    >
      <Flash searchParams={query} />
      <AreaIntro areaKey="skills_development" preview={preview} />

      <section id="inputs" className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <AutoSaveForm action={saveSkillsDevelopmentInputs}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection
            title="Confirmations and payroll"
            description="No skills development points count until the first three documents are confirmed."
            worth={null}
          >
            <SelectField
              label="Workplace skills plan and training report approved by the SETA"
              name="wspAtrSetaApproved"
              defaultValue={yesNo(s.wspAtrSetaApproved)}
              hint="Needed before any skills points count."
              options={[
                { value: '', label: 'Not confirmed yet' },
                { value: 'yes', label: 'Yes, approved' },
                { value: 'no', label: 'No' },
              ]}
            />
            <SelectField
              label="Pivotal training report submitted"
              name="pivotalReportSubmitted"
              defaultValue={yesNo(s.pivotalReportSubmitted)}
              hint="Needed before any skills points count."
              options={[
                { value: '', label: 'Not confirmed yet' },
                { value: 'yes', label: 'Yes, submitted' },
                { value: 'no', label: 'No' },
              ]}
            />
            <SelectField
              label="Priority skills programme in place"
              name="prioritySkillsProgrammeImplemented"
              defaultValue={yesNo(s.prioritySkillsProgrammeImplemented)}
              hint="Needed before any skills points count."
              options={[
                { value: '', label: 'Not confirmed yet' },
                { value: 'yes', label: 'Yes, in place' },
                { value: 'no', label: 'No' },
              ]}
            />
            <SelectField
              label="Register of trainees kept"
              name="trainingRegisterMaintained"
              defaultValue={yesNo(s.trainingRegisterMaintained)}
              hint="Only affects the bonus points for taking learners on, never the main 20."
              options={[
                { value: '', label: 'Not confirmed yet' },
                { value: 'yes', label: 'Yes, kept' },
                { value: 'no', label: 'No' },
              ]}
            />
            <Field
              label="Leviable payroll (R)"
              name="leviableAmount"
              type="number"
              step="0.01"
              defaultValue={s.leviableAmount}
              explain="The payroll the skills levy is worked out on, from the EMP201."
              example="10 000 000"
              fromWorkbook={tag('leviableAmount')}
            />
            <Field
              label="All employees"
              name="totalEmployees"
              type="number"
              step="1"
              defaultValue={s.totalEmployees}
              explain="Everyone employed by the company."
              example="500"
              fromWorkbook={tag('totalEmployees')}
            />
          </AreaSection>

          <AreaSection
            title="Training spend"
            description="What was spent training black employees, by group, and on training black people with disabilities."
            worth={sectionWorth(element, ['skills_development.expenditure'])}
          >
            {byGroup('general', 'generalTrainingSpendByDemographic', 'rand')}
            <Field
              label="Training people with disabilities (R)"
              name="disabilityTrainingSpend"
              type="number"
              step="0.01"
              defaultValue={s.disabilityTrainingSpend}
              explain="Spent training black employees with disabilities."
              example="18 000"
              fromWorkbook={tag('disabilityTrainingSpend')}
            />
          </AreaSection>

          <AreaSection
            title="Bursaries"
            description="Bursaries paid for black students, by group."
            worth={sectionWorth(element, ['skills_development.bursaries'])}
          >
            {byGroup('bursary', 'bursarySpendByDemographic', 'rand')}
          </AreaSection>

          <AreaSection
            title="Learnerships, apprenticeships and internships"
            description="How many black learners, apprentices and interns, by group."
            worth={sectionWorth(element, ['skills_development.learnerships', 'skills_development.bonus'])}
          >
            {byGroup('learner', 'learnerHeadcountByDemographic', 'people')}
            <Field label="Learners who finished" name="learnersCompleted" type="number" step="1" defaultValue={s.learnersCompleted} example="12" fromWorkbook={tag('learnersCompleted')} />
            <Field
              label="Learners taken on afterwards"
              name="learnersAbsorbed"
              type="number"
              step="1"
              defaultValue={s.learnersAbsorbed}
              explain="Employed by the company, or elsewhere, after finishing."
              example="5"
              fromWorkbook={tag('learnersAbsorbed')}
            />
          </AreaSection>

          <MoreOptions label="More options: total spend, informal learning and admin costs">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total skills spend (R)" name="totalSkillsDevelopmentSpend" type="number" step="0.01" defaultValue={s.totalSkillsDevelopmentSpend} explain="Everything spent on skills development." fromWorkbook={tag('totalSkillsDevelopmentSpend')} />
              <Field label="Informal workplace learning (R)" name="informalWorkplaceLearningSpend" type="number" step="0.01" defaultValue={s.informalWorkplaceLearningSpend} hint="At most 15% of the total spend counts." fromWorkbook={tag('informalWorkplaceLearningSpend')} />
              <Field label="Training administration (R)" name="trainingAdministrationCost" type="number" step="0.01" defaultValue={s.trainingAdministrationCost} hint="At most 15% of the total spend counts." fromWorkbook={tag('trainingAdministrationCost')} />
            </div>
          </MoreOptions>
        </AutoSaveForm>
      </section>

      {element ? (
        <MoreOptions label={`How the points are worked out (${element.indicators.length} lines)`}>
          <IndicatorTable element={element} />
        </MoreOptions>
      ) : null}
    </Shell>
  )
}
