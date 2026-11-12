import Link from 'next/link'
import { notFound } from 'next/navigation'
import { saveManagementControlInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { Field, Flash, IndicatorTable, Shell } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaIntro, AreaSection, sectionWorth } from '../workspace'
import { sameAsWorkbook, workbookReading, workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Notice'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { Term } from '@/components/ui/Term'
import { PageHelpData } from '@/components/help/PageHelpData'
import { managementControlWarnings } from '@/lib/scorecard/generic/ux/sanity'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { areaHelpData, figureGap } from '../area-help-a'

/** Page help: each group of management control lines, by its key prefix. */
const MC_GAP_NAMES: Array<[string, string]> = [
  ['management_control.board', 'the board'],
  ['management_control.executive_directors', 'executive directors'],
  ['management_control.other_executive_management', 'other executives'],
  ['management_control.senior_management', 'senior management'],
  ['management_control.middle_management', 'middle management'],
  ['management_control.junior_management', 'junior management'],
  ['management_control.employees_with_disabilities', 'staff with disabilities'],
]

/** Realistic examples for the six groups (senior, middle, junior), in BAND_GROUPS order. */
const BAND_EXAMPLES: Record<'seniorManagement' | 'middleManagement' | 'juniorManagement', string[]> = {
  seniorManagement: ['8', '2', '2', '6', '2', '2'],
  middleManagement: ['30', '8', '6', '28', '8', '6'],
  juniorManagement: ['100', '25', '10', '95', '25', '10'],
}

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Management control' }

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const BAND_GROUPS = [
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

export default async function ManagementControlPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, inputs, elements } = loaded
  const m = inputs.managementControl
  const warn = managementControlWarnings(m) as Record<string, string | undefined>
  const element = preview.elements.find((candidate) => candidate.elementKey === 'management_control')
  const stored = elements.find((row) => row.element_key === 'management_control')
  const importRows = (stored?.import_snapshot as { validRowCount?: number; importVersion?: string } | null) ?? null
  const workflow = workflowForLoaded(loaded, 'management-control')
  const reading = workbookReading(loaded)?.managementControl
  const tag = (...path: string[]) => sameAsWorkbook(at(reading, path), at(m, path))
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const eapMissing = !m.eapTargetSetLabel && !m.eapDistribution
  const workspace = workspaceFor(loaded, workflow, 'management_control')
  const hereHref = `${base}/management-control#inputs`
  // Page help: what is still empty, from the engine's unscored lines. Without
  // workforce targets the three management levels are blocked; that is one gap
  // (fixed on the Review page), plus any level whose total is still empty.
  const bands = [
    ['senior management', m.seniorManagement.total],
    ['middle management', m.middleManagement.total],
    ['junior management', m.juniorManagement.total],
  ] as const
  const helpData = areaHelpData({
    areaKey: 'management_control',
    preview,
    workspace,
    hereHref,
    gaps: [
      ...(m.eapDistribution ? [] : [{ name: 'the workforce (EAP) targets', href: `${base}/review`, label: 'Attach on the Review page' }]),
      ...(element?.indicators ?? [])
        .filter((indicator) => indicator.status !== 'scored' && !(indicator.status === 'blocked' && !m.eapDistribution))
        .map((indicator) => figureGap(MC_GAP_NAMES.find(([prefix]) => indicator.indicatorKey.startsWith(prefix))?.[1] ?? indicator.displayName.toLowerCase(), hereHref)),
      ...(m.eapDistribution ? [] : bands.filter(([, total]) => total == null).map(([name]) => figureGap(name, hereHref))),
    ],
  })

  const band = (
    prefix: string,
    title: string,
    key: 'seniorManagement' | 'middleManagement' | 'juniorManagement',
    example: string,
    target: string,
  ) => (
    <div className="space-y-3 rounded-control border border-line bg-sunken p-4 sm:col-span-2">
      <p className="text-body font-semibold text-ink">
        {title} <span className="font-normal text-label">· Target: {target}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Everyone in this level"
          name={`${prefix}Total`}
          warning={warn[`${prefix}Total`]}
          type="number"
          step="1"
          defaultValue={m[key].total}
          explain="All staff at this level, of every race."
          // TODO-VERIFY: which EE report (EEA2) level matches each management level.
          source="the EE report (EEA2), at the matching level"
          example={example}
          fromWorkbook={tag(key, 'total')}
        />
        {BAND_GROUPS.map((group, index) => (
          <Field
            key={group.key}
            label={group.label}
            name={`${prefix}${group.suffix}`}
            type="number"
            step="1"
            defaultValue={m[key].byDemographic[group.key] ?? 0}
            example={BAND_EXAMPLES[key][index]}
            fromWorkbook={tag(key, 'byDemographic', group.key)}
          />
        ))}
      </div>
    </div>
  )

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="management-control"
      title="Management control"
      subtitle={AREA_COPY.management_control.measures}
      workflow={workflow}
      workspace={workspace}
    >
      <PageHelpData page="area-management-control" data={helpData} />
      <Flash searchParams={query} />
      <AreaIntro areaKey="management_control" preview={preview} company={company.name} />

      <section id="inputs" aria-label="Figures">
        <AutoSaveForm action={saveManagementControlInputs}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection helpId="mc-board" title="The board" description="Count people, not percentages." worth={sectionWorth(element, ['management_control.board'])}>
            <Field label="Board members" name="boardTotal" warning={warn.boardTotal} type="number" step="1" defaultValue={m.board.total} explain="Everyone with a vote on the board." source="the register of directors" example="10" fromWorkbook={tag('board', 'total')} />
            <Field label="Black board members" name="boardBlack" warning={warn.boardBlack} type="number" step="1" defaultValue={m.board.black} explain="Black people with a vote on the board. Target: half the board." source="the register of directors" example="4" fromWorkbook={tag('board', 'black')} />
            <Field label="Black women board members" name="boardBlackWomen" warning={warn.boardBlackWomen} type="number" step="1" defaultValue={m.board.blackWomen} explain="Black women with a vote on the board. Target: a quarter of the board." source="the register of directors" example="2" fromWorkbook={tag('board', 'blackWomen')} />
          </AreaSection>

          <AreaSection
            title="Executives"
            description="Executive directors sit on the board; other executives run the company day to day."
            worth={sectionWorth(element, ['management_control.executive_directors', 'management_control.other_executive_management'])}
          >
            <Field label="Executive directors" name="execDirTotal" warning={warn.execDirTotal} type="number" step="1" defaultValue={m.executiveDirectors.total} explain="Board members who also work in the company." source="the register of directors" example="3" fromWorkbook={tag('executiveDirectors', 'total')} />
            <Field label="Black executive directors" name="execDirBlack" warning={warn.execDirBlack} type="number" step="1" defaultValue={m.executiveDirectors.black} explain="Target: half the executive directors." source="the register of directors" example="1" fromWorkbook={tag('executiveDirectors', 'black')} />
            <Field label="Black women executive directors" name="execDirBlackWomen" warning={warn.execDirBlackWomen} type="number" step="1" defaultValue={m.executiveDirectors.blackWomen} explain="Target: a quarter of the executive directors." source="the register of directors" example="1" fromWorkbook={tag('executiveDirectors', 'blackWomen')} />
            {/* TODO-VERIFY: where to find other executives (organogram / EEA2 top management). */}
            <Field label="Other executives" name="otherExecTotal" warning={warn.otherExecTotal} type="number" step="1" defaultValue={m.otherExecutiveManagement.total} explain="Executive managers who are not directors." source="the organogram, or the Top management level of the EE report (EEA2)" example="8" fromWorkbook={tag('otherExecutiveManagement', 'total')} />
            <Field label="Black other executives" name="otherExecBlack" warning={warn.otherExecBlack} type="number" step="1" defaultValue={m.otherExecutiveManagement.black} explain="Target: 60% of the other executives." source="the organogram, or the Top management level of the EE report (EEA2)" example="3" fromWorkbook={tag('otherExecutiveManagement', 'black')} />
            <Field label="Black women other executives" name="otherExecBlackWomen" warning={warn.otherExecBlackWomen} type="number" step="1" defaultValue={m.otherExecutiveManagement.blackWomen} explain="Target: 30% of the other executives." source="the organogram, or the Top management level of the EE report (EEA2)" example="1" fromWorkbook={tag('otherExecutiveManagement', 'blackWomen')} />
          </AreaSection>

          <AreaSection
            helpId="mc-management"
            title="Senior, middle and junior management"
            description="Headcounts by race and gender. These are compared with the workforce (EAP) targets."
            worth={sectionWorth(element, ['management_control.senior_management', 'management_control.middle_management', 'management_control.junior_management'])}
          >
            {eapMissing ? (
              <div className="sm:col-span-2">
                <Notice
                  tone="warn"
                  title="These need the workforce targets"
                  action={
                    <Link href={`${base}/review`} className={buttonStyles({ variant: 'secondary' })}>
                      Attach the workforce targets
                    </Link>
                  }
                >
                  Until the <Term k="eap">EAP</Term> targets are attached these three levels score nothing. Attaching them takes one click on the review page.
                </Notice>
              </div>
            ) : null}
            {/* TODO-VERIFY: the EE report (EEA2) level names for each management level. */}
            <p className="text-meta text-label sm:col-span-2">
              For each level, enter everyone at that level, then the black people in each group, as headcounts. Find them in the EE
              report (EEA2): senior management is its Senior management level, middle management its Professionally qualified level,
              and junior management its Skilled technical level. Each group is scored against its share of the{' '}
              <Term k="eap">EAP</Term>, so every group counts.
            </p>
            {band('senior', 'Senior management', 'seniorManagement', '40', '60% black, 30% black women')}
            {band('middle', 'Middle management', 'middleManagement', '120', '75% black, 38% black women')}
            {band('junior', 'Junior management', 'juniorManagement', '300', '88% black, 44% black women')}
          </AreaSection>

          <AreaSection
            title="Staff with disabilities"
            worth={sectionWorth(element, ['management_control.employees_with_disabilities'])}
          >
            {/* TODO-VERIFY: where to find black employees with disabilities. */}
            <Field label="Black employees with disabilities" name="blackEmployeesWithDisabilities" warning={warn.blackEmployeesWithDisabilities} type="number" step="1" defaultValue={m.blackEmployeesWithDisabilities} explain="Black employees with a disability. Target: 2% of all employees." source="the EE report (EEA2) or HR records" example="6" fromWorkbook={tag('blackEmployeesWithDisabilities')} />
            <Field label="All employees" name="totalEmployees" warning={warn.totalEmployees} type="number" step="1" defaultValue={m.totalEmployees} explain="Everyone employed by the company." source="payroll or the EE report (EEA2)" example="500" fromWorkbook={tag('totalEmployees')} />
          </AreaSection>

          <MoreOptions label="More options: import an employee register">
            <p className="text-body text-label">
              {importRows?.validRowCount
                ? `${importRows.validRowCount} register rows imported${importRows.importVersion ? ` (${importRows.importVersion})` : ''}.`
                : 'No separate employee register has been imported.'}{' '}
              A register is a list of people by level, race and gender; the headcounts above are worked out from it.
            </p>
            <Link href={`/scorecards/calculator/${assessmentId}/elements/management_control`} className="text-body font-semibold text-teal hover:underline">
              Import an employee register
            </Link>
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
