import { notFound } from 'next/navigation'
import { saveSkillsDevelopmentInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { Field, Flash, IndicatorTable, SelectField, Shell } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaIntro, AreaSection, sectionWorth } from '../workspace'
import { sameAsWorkbook, workbookReading, workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Card'
import { Term } from '@/components/ui/Term'
import { PageHelpData } from '@/components/help/PageHelpData'
import { skillsWarnings } from '@/lib/scorecard/generic/ux/sanity'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { areaHelpData, figureGap } from '../area-help-a'

/** Page help: each skills line in the words the page uses. */
const SKILLS_GAP_NAMES: Record<string, string> = {
  'skills_development.expenditure.black_people': 'training spend',
  'skills_development.bursaries.black_students': 'bursaries',
  'skills_development.expenditure.disabled_black_people': 'training people with disabilities',
  'skills_development.learnerships': 'learners',
  'skills_development.bonus.absorption': 'learners who finished',
}

/** Realistic examples for the six groups, in GROUPS order. */
const GROUP_EXAMPLES: Record<'generalTrainingSpendByDemographic' | 'bursarySpendByDemographic' | 'learnerHeadcountByDemographic', string[]> = {
  generalTrainingSpendByDemographic: ['120 000', '30 000', '15 000', '110 000', '30 000', '15 000'],
  bursarySpendByDemographic: ['60 000', '15 000', '10 000', '70 000', '15 000', '10 000'],
  learnerHeadcountByDemographic: ['7', '2', '1', '9', '3', '1'],
}

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Skills development' }

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
  const warn = skillsWarnings(s) as Record<string, string | undefined>
  const element = preview.elements.find((candidate) => candidate.elementKey === 'skills_development')
  const yesNo = (value: boolean | null) => (value == null ? '' : value ? 'yes' : 'no')
  const workflow = workflowForLoaded(loaded, 'skills-development')
  const reading = workbookReading(loaded)?.skillsDevelopment
  const tag = (...path: string[]) => sameAsWorkbook(at(reading, path), at(s, path))
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const workspace = workspaceFor(loaded, workflow, 'skills_development')
  const hereHref = `${base}/skills-development#inputs`

  // Page help: what is still empty. The three confirmations, the workforce
  // targets and the trainee register block lines outright (named once each);
  // every other unscored line is named by its group of fields.
  const gateUnmet = s.wspAtrSetaApproved !== true || s.pivotalReportSubmitted !== true || s.prioritySkillsProgrammeImplemented !== true
  const helpData = areaHelpData({
    areaKey: 'skills_development',
    preview,
    workspace,
    hereHref,
    gaps: [
      ...(s.wspAtrSetaApproved === true ? [] : [figureGap('a Yes for the SETA-approved skills plan and training report', hereHref)]),
      ...(s.pivotalReportSubmitted === true ? [] : [figureGap('a Yes for the Pivotal training report', hereHref)]),
      ...(s.prioritySkillsProgrammeImplemented === true ? [] : [figureGap('a Yes for the priority skills programme', hereHref)]),
      ...(s.eapDistribution ? [] : [{ name: 'the workforce (EAP) targets', href: `${base}/review`, label: 'Attach on the Review page' }]),
      ...(s.leviableAmount == null ? [figureGap('the leviable payroll', hereHref)] : []),
      ...(s.totalEmployees == null ? [figureGap('all employees', hereHref)] : []),
      ...(s.trainingRegisterMaintained == null ? [figureGap('whether a register of trainees is kept', hereHref)] : []),
      ...(gateUnmet
        ? []
        : (element?.indicators ?? [])
            .filter((indicator) => indicator.status !== 'scored' && indicator.status !== 'blocked')
            .filter((indicator) => !(s.leviableAmount == null && indicator.indicatorKey !== 'skills_development.learnerships' && indicator.indicatorKey !== 'skills_development.bonus.absorption'))
            .filter((indicator) => !(s.totalEmployees == null && indicator.indicatorKey === 'skills_development.learnerships'))
            .map((indicator) =>
              figureGap(
                indicator.indicatorKey === 'skills_development.bonus.absorption' && s.learnersCompleted === 0
                  ? 'the learner bonus, which cannot be scored with 0 learners who finished'
                  : (SKILLS_GAP_NAMES[indicator.indicatorKey] ?? indicator.displayName.toLowerCase()),
                hereHref,
              ),
            )),
    ],
  })

  const byGroup = (
    prefix: string,
    key: 'generalTrainingSpendByDemographic' | 'bursarySpendByDemographic' | 'learnerHeadcountByDemographic',
    unit: 'rand' | 'people',
  ) => (
    <div className="grid gap-3 rounded-control border border-line bg-sunken p-4 sm:col-span-2 sm:grid-cols-3">
      {GROUPS.map((group, index) => (
        <Field
          key={group.key}
          label={unit === 'rand' ? `${group.label} (R)` : group.label}
          name={`${prefix}${group.suffix}`}
          type="number"
          step={unit === 'rand' ? '0.01' : '1'}
          defaultValue={s[key][group.key] ?? 0}
          example={GROUP_EXAMPLES[key][index]}
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
      workspace={workspace}
    >
      <PageHelpData page="area-skills-development" data={helpData} />
      <Flash searchParams={query} />
      <AreaIntro areaKey="skills_development" preview={preview} company={company.name} />

      <section id="inputs" aria-label="Figures">
        <AutoSaveForm action={saveSkillsDevelopmentInputs}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection
            helpId="skills-confirmations"
            title="Confirmations and payroll"
            description="No skills development points count until the first three documents are confirmed."
            worth={null}
          >
            <SelectField
              label="Workplace skills plan and training report approved by the SETA"
              name="wspAtrSetaApproved" warning={warn.wspAtrSetaApproved}
              defaultValue={yesNo(s.wspAtrSetaApproved)}
              // TODO-VERIFY: where the SETA approval is found.
              hint="Needed before any skills points count. Yes when the SETA has approved this year’s Workplace Skills Plan (WSP) and Annual Training Report (ATR). Find it in the SETA’s acceptance letter or its online portal."
              options={[
                { value: '', label: 'Not confirmed yet' },
                { value: 'yes', label: 'Yes, approved' },
                { value: 'no', label: 'No' },
              ]}
            />
            <SelectField
              label="Pivotal training report submitted"
              name="pivotalReportSubmitted" warning={warn.pivotalReportSubmitted}
              defaultValue={yesNo(s.pivotalReportSubmitted)}
              // TODO-VERIFY: where proof of the Pivotal report submission is found.
              hint="Needed before any skills points count. Yes when the Pivotal training report has been submitted to the SETA. Find it in the SETA’s confirmation of the submission."
              options={[
                { value: '', label: 'Not confirmed yet' },
                { value: 'yes', label: 'Yes, submitted' },
                { value: 'no', label: 'No' },
              ]}
            />
            <SelectField
              label="Priority skills programme in place"
              name="prioritySkillsProgrammeImplemented" warning={warn.prioritySkillsProgrammeImplemented}
              defaultValue={yesNo(s.prioritySkillsProgrammeImplemented)}
              // TODO-VERIFY: what counts as a priority skills programme, and where to find it.
              hint="Needed before any skills points count. Yes when the company runs training for the scarce and critical skills its SETA lists. Find it in the training plan and the SETA’s sector skills plan."
              options={[
                { value: '', label: 'Not confirmed yet' },
                { value: 'yes', label: 'Yes, in place' },
                { value: 'no', label: 'No' },
              ]}
            />
            <SelectField
              label="Register of trainees kept"
              name="trainingRegisterMaintained" warning={warn.trainingRegisterMaintained}
              defaultValue={yesNo(s.trainingRegisterMaintained)}
              hint="Only affects the bonus points for taking learners on, never the main 20. Yes when the company keeps a record of each trainee. Find it in the training records. Left unanswered, the area cannot be done."
              options={[
                { value: '', label: 'Not confirmed yet' },
                { value: 'yes', label: 'Yes, kept' },
                { value: 'no', label: 'No' },
              ]}
            />
            <Field
              label={
                <>
                  <Term k="leviable">Leviable payroll</Term> (R)
                </>
              }
              name="leviableAmount" warning={warn.leviableAmount}
              type="number"
              step="0.01"
              defaultValue={s.leviableAmount}
              explain="The payroll the skills levy is worked out on, for the whole year. The spending targets are a percentage of it."
              source="the year’s EMP201 returns"
              example="10 000 000"
              fromWorkbook={tag('leviableAmount')}
            />
            <Field
              label="All employees"
              name="totalEmployees" warning={warn.totalEmployees}
              type="number"
              step="1"
              defaultValue={s.totalEmployees}
              explain="Everyone employed by the company. The learner target is 5% of this number."
              source="payroll"
              example="500"
              fromWorkbook={tag('totalEmployees')}
            />
          </AreaSection>

          <AreaSection
            helpId="skills-spend"
            title="Training spend"
            description="What was spent training black employees, by group, and on training black people with disabilities."
            worth={sectionWorth(element, ['skills_development.expenditure'])}
          >
            <p className="text-meta text-label sm:col-span-2">
              Enter the rand spent training black employees in each group. Find it in the Annual Training Report and the training
              invoices. Target: 3.5% of the leviable payroll, split across the groups by their share of the <Term k="eap">EAP</Term>.
            </p>
            {byGroup('general', 'generalTrainingSpendByDemographic', 'rand')}
            <Field
              label="Training people with disabilities (R)"
              name="disabilityTrainingSpend" warning={warn.disabilityTrainingSpend}
              type="number"
              step="0.01"
              defaultValue={s.disabilityTrainingSpend}
              explain="Spent training black employees with disabilities. Target: 0.3% of the leviable payroll."
              source="the Annual Training Report and the training invoices"
              example="18 000"
              fromWorkbook={tag('disabilityTrainingSpend')}
            />
          </AreaSection>

          <AreaSection
            title="Bursaries"
            description="Bursaries paid for black students, by group."
            worth={sectionWorth(element, ['skills_development.bursaries'])}
          >
            <p className="text-meta text-label sm:col-span-2">
              Enter the rand paid in bursaries for black students at universities and colleges, in each group. Find it in the bursary
              agreements and proof of payment. Target: 2.5% of the leviable payroll, split across the groups by EAP.
            </p>
            {byGroup('bursary', 'bursarySpendByDemographic', 'rand')}
          </AreaSection>

          <AreaSection
            helpId="skills-learners"
            title="Learnerships, apprenticeships and internships"
            description="How many black learners, apprentices and interns, by group."
            worth={sectionWorth(element, ['skills_development.learnerships', 'skills_development.bonus'])}
          >
            {/* TODO-VERIFY: where to find learner headcounts. */}
            <p className="text-meta text-label sm:col-span-2">
              Enter how many black learners, apprentices and interns there were in each group. Find them in the learnership
              agreements registered with the SETA and the trainee register. Target: 5% of all employees, split across the groups by EAP.
            </p>
            {byGroup('learner', 'learnerHeadcountByDemographic', 'people')}
            <Field
              label="Learners who finished"
              name="learnersCompleted"
              warning={warn.learnersCompleted}
              type="number"
              step="1"
              defaultValue={s.learnersCompleted}
              explain="Black learners who completed a learnership, apprenticeship or internship this year."
              source="the trainee register"
              example="12"
              fromWorkbook={tag('learnersCompleted')}
            />
            {/* TODO-VERIFY: "or elsewhere" (existing copy); the engine's label is "absorbed into permanent employment". */}
            <Field
              label="Learners taken on afterwards"
              name="learnersAbsorbed" warning={warn.learnersAbsorbed}
              type="number"
              step="1"
              defaultValue={s.learnersAbsorbed}
              explain={
                <>
                  Employed by the company, or elsewhere, after finishing. Taken on ÷ finished earns up to 5{' '}
                  <Term k="bonusPoints">bonus points</Term>.
                </>
              }
              source="the trainee register and the employment contracts"
              example="5"
              fromWorkbook={tag('learnersAbsorbed')}
            />
          </AreaSection>

          <MoreOptions label="More options: total spend, informal learning and admin costs">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Total skills spend (R)"
                name="totalSkillsDevelopmentSpend"
                warning={warn.totalSkillsDevelopmentSpend}
                type="number"
                step="0.01"
                defaultValue={s.totalSkillsDevelopmentSpend}
                explain="Everything spent on skills development. Used only to work out the two 15% limits; left empty, the spend entered above is added up instead."
                source="the Annual Training Report"
                example="600 000"
                fromWorkbook={tag('totalSkillsDevelopmentSpend')}
              />
              {/* TODO-VERIFY: what informal workplace learning covers, and where to find it. */}
              <Field
                label="Informal workplace learning (R)"
                name="informalWorkplaceLearningSpend"
                warning={warn.informalWorkplaceLearningSpend}
                type="number"
                step="0.01"
                defaultValue={s.informalWorkplaceLearningSpend}
                explain="The part of the training spend that was informal or on-the-job learning."
                source="the Annual Training Report"
                example="50 000"
                hint="At most 15% of the total spend counts; anything above it is taken off the training spend."
                fromWorkbook={tag('informalWorkplaceLearningSpend')}
              />
              {/* TODO-VERIFY: where to find training administration costs. */}
              <Field
                label="Training administration (R)"
                name="trainingAdministrationCost"
                warning={warn.trainingAdministrationCost}
                type="number"
                step="0.01"
                defaultValue={s.trainingAdministrationCost}
                explain="The cost of administering training."
                source="the training budget or the general ledger"
                example="30 000"
                hint="At most 15% of the total spend counts; anything above it is taken off the training spend."
                fromWorkbook={tag('trainingAdministrationCost')}
              />
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
