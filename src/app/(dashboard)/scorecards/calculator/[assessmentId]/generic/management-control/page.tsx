import Link from 'next/link'
import { notFound } from 'next/navigation'
import { saveManagementControlInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { Field, Flash, IndicatorTable, Shell } from '../ui'
import { AutoSaveForm } from '../AutoSaveForm'
import { AreaIntro, AreaSection, sectionWorth } from '../workspace'
import { sameAsWorkbook, workbookReading, workflowForLoaded, workspaceFor } from '../workflow-context'
import { MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'

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
  const element = preview.elements.find((candidate) => candidate.elementKey === 'management_control')
  const stored = elements.find((row) => row.element_key === 'management_control')
  const importRows = (stored?.import_snapshot as { validRowCount?: number; importVersion?: string } | null) ?? null
  const workflow = workflowForLoaded(loaded, 'management-control')
  const reading = workbookReading(loaded)?.managementControl
  const tag = (...path: string[]) => sameAsWorkbook(at(reading, path), at(m, path))
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const eapMissing = !m.eapTargetSetLabel && !m.eapDistribution

  const band = (prefix: string, title: string, key: 'seniorManagement' | 'middleManagement' | 'juniorManagement', example: string) => (
    <div className="space-y-3 rounded-control border border-line bg-sunken p-4 sm:col-span-2">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Everyone in this level"
          name={`${prefix}Total`}
          type="number"
          step="1"
          defaultValue={m[key].total}
          explain="All staff at this level, of every race."
          example={example}
          fromWorkbook={tag(key, 'total')}
        />
        {BAND_GROUPS.map((group) => (
          <Field
            key={group.key}
            label={group.label}
            name={`${prefix}${group.suffix}`}
            type="number"
            step="1"
            defaultValue={m[key].byDemographic[group.key] ?? 0}
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
      workspace={workspaceFor(loaded, workflow, 'management_control')}
    >
      <Flash searchParams={query} />
      <AreaIntro areaKey="management_control" preview={preview} />

      <section id="inputs" className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <AutoSaveForm action={saveManagementControlInputs}>
          <input type="hidden" name="assessmentId" value={assessmentId} />

          <AreaSection title="The board" description="Count people, not percentages." worth={sectionWorth(element, ['management_control.board'])}>
            <Field label="Board members" name="boardTotal" type="number" step="1" defaultValue={m.board.total} explain="Everyone with a vote on the board." example="10" fromWorkbook={tag('board', 'total')} />
            <Field label="Black board members" name="boardBlack" type="number" step="1" defaultValue={m.board.black} example="4" fromWorkbook={tag('board', 'black')} />
            <Field label="Black women board members" name="boardBlackWomen" type="number" step="1" defaultValue={m.board.blackWomen} example="2" fromWorkbook={tag('board', 'blackWomen')} />
          </AreaSection>

          <AreaSection
            title="Executives"
            description="Executive directors sit on the board; other executives run the company day to day."
            worth={sectionWorth(element, ['management_control.executive_directors', 'management_control.other_executive_management'])}
          >
            <Field label="Executive directors" name="execDirTotal" type="number" step="1" defaultValue={m.executiveDirectors.total} example="3" fromWorkbook={tag('executiveDirectors', 'total')} />
            <Field label="Black executive directors" name="execDirBlack" type="number" step="1" defaultValue={m.executiveDirectors.black} example="1" fromWorkbook={tag('executiveDirectors', 'black')} />
            <Field label="Black women executive directors" name="execDirBlackWomen" type="number" step="1" defaultValue={m.executiveDirectors.blackWomen} example="1" fromWorkbook={tag('executiveDirectors', 'blackWomen')} />
            <Field label="Other executives" name="otherExecTotal" type="number" step="1" defaultValue={m.otherExecutiveManagement.total} explain="Executive managers who are not directors." example="8" fromWorkbook={tag('otherExecutiveManagement', 'total')} />
            <Field label="Black other executives" name="otherExecBlack" type="number" step="1" defaultValue={m.otherExecutiveManagement.black} example="3" fromWorkbook={tag('otherExecutiveManagement', 'black')} />
            <Field label="Black women other executives" name="otherExecBlackWomen" type="number" step="1" defaultValue={m.otherExecutiveManagement.blackWomen} example="1" fromWorkbook={tag('otherExecutiveManagement', 'blackWomen')} />
          </AreaSection>

          <AreaSection
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
                  Until they are attached these three lines score nothing. Attaching them takes one click on the review page.
                </Notice>
              </div>
            ) : null}
            {band('senior', 'Senior management', 'seniorManagement', '40')}
            {band('middle', 'Middle management', 'middleManagement', '120')}
            {band('junior', 'Junior management', 'juniorManagement', '300')}
          </AreaSection>

          <AreaSection
            title="Staff with disabilities"
            worth={sectionWorth(element, ['management_control.employees_with_disabilities'])}
          >
            <Field label="Black employees with disabilities" name="blackEmployeesWithDisabilities" type="number" step="1" defaultValue={m.blackEmployeesWithDisabilities} example="6" fromWorkbook={tag('blackEmployeesWithDisabilities')} />
            <Field label="All employees" name="totalEmployees" type="number" step="1" defaultValue={m.totalEmployees} explain="Everyone employed by the company." example="500" fromWorkbook={tag('totalEmployees')} />
          </AreaSection>

          <MoreOptions label="More options: import an employee register">
            <p className="text-[15px] text-muted">
              {importRows?.validRowCount
                ? `${importRows.validRowCount} register rows imported${importRows.importVersion ? ` (${importRows.importVersion})` : ''}.`
                : 'No separate employee register has been imported.'}{' '}
              A register is a list of people by level, race and gender; the headcounts above are worked out from it.
            </p>
            <Link href={`/scorecards/calculator/${assessmentId}/elements/management_control`} className="text-[15px] font-semibold text-brand hover:underline">
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
