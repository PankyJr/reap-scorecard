import Link from 'next/link'
import { notFound } from 'next/navigation'
import { saveManagementControlInputs } from '../actions'
import { loadGenericAssessment } from '../load'
import { AssessmentAside, Card, Field, Flash, IndicatorTable, Shell, FormCard } from '../ui'
import { storedCalculation, workflowForLoaded } from '../workflow-context'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function BandFields(args: { prefix: string; label: string; total: number | null; byDemographic: Record<string, number | undefined> }) {
  const d = args.byDemographic
  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{args.label}</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Total" name={`${args.prefix}Total`} type="number" step="1" defaultValue={args.total} />
        <Field label="African male" name={`${args.prefix}AfricanMale`} type="number" step="1" defaultValue={d.african_male ?? 0} />
        <Field label="Coloured male" name={`${args.prefix}ColouredMale`} type="number" step="1" defaultValue={d.coloured_male ?? 0} />
        <Field label="Indian male" name={`${args.prefix}IndianMale`} type="number" step="1" defaultValue={d.indian_male ?? 0} />
        <Field label="African female" name={`${args.prefix}AfricanFemale`} type="number" step="1" defaultValue={d.african_female ?? 0} />
        <Field label="Coloured female" name={`${args.prefix}ColouredFemale`} type="number" step="1" defaultValue={d.coloured_female ?? 0} />
        <Field label="Indian female" name={`${args.prefix}IndianFemale`} type="number" step="1" defaultValue={d.indian_female ?? 0} />
      </div>
    </div>
  )
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

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="management-control"
      title="Management Control — 19 points"
      subtitle="Upload Board, Executive Committee and Staff List registers through the modular importer, then capture the denominators and EAP-linked headcounts here. Sensitive personal fields never appear in this workspace."
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

      <Card title="Register import">
        <p className="text-sm text-slate-700">
          {importRows?.validRowCount
            ? `${importRows.validRowCount} privacy-safe register rows imported${importRows.importVersion ? ` (${importRows.importVersion})` : ''}.`
            : 'No register has been imported yet.'}
        </p>
        <Link
          href={`/scorecards/calculator/${assessmentId}/elements/management_control`}
          className="inline-flex text-sm font-semibold text-[#063b3f] hover:underline"
        >
          Open Management Control importer →
        </Link>
        <p className="text-xs text-slate-500">
          {m.eapTargetSetLabel
            ? `EAP target set: ${m.eapTargetSetLabel}.`
            : 'EAP target set: not attached. Attach an active EAP set from the assessment page before scoring the occupational bands.'}
        </p>
      </Card>

      {element ? (
        <Card title="Current score">
          <IndicatorTable element={element} />
        </Card>
      ) : null}

      <FormCard title="Capture denominators and headcounts" action={saveManagementControlInputs}>
          <div className="space-y-5">
            <input type="hidden" name="assessmentId" value={assessmentId} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Board total" name="boardTotal" type="number" step="1" defaultValue={m.board.total} />
            <Field label="Black board members" name="boardBlack" type="number" step="1" defaultValue={m.board.black} />
            <Field label="Black women board members" name="boardBlackWomen" type="number" step="1" defaultValue={m.board.blackWomen} />
            <Field label="Executive directors total" name="execDirTotal" type="number" step="1" defaultValue={m.executiveDirectors.total} />
            <Field label="Black executive directors" name="execDirBlack" type="number" step="1" defaultValue={m.executiveDirectors.black} />
            <Field label="Black women executive directors" name="execDirBlackWomen" type="number" step="1" defaultValue={m.executiveDirectors.blackWomen} />
            <Field label="Other executive management total" name="otherExecTotal" type="number" step="1" defaultValue={m.otherExecutiveManagement.total} />
            <Field label="Black other executive management" name="otherExecBlack" type="number" step="1" defaultValue={m.otherExecutiveManagement.black} />
            <Field label="Black women other executive management" name="otherExecBlackWomen" type="number" step="1" defaultValue={m.otherExecutiveManagement.blackWomen} />
            <Field label="Black employees with disabilities" name="blackEmployeesWithDisabilities" type="number" step="1" defaultValue={m.blackEmployeesWithDisabilities} />
            <Field label="Total employees" name="totalEmployees" type="number" step="1" defaultValue={m.totalEmployees} />
          </div>
          <BandFields prefix="senior" label="Senior management" total={m.seniorManagement.total} byDemographic={m.seniorManagement.byDemographic} />
          <BandFields prefix="middle" label="Middle management" total={m.middleManagement.total} byDemographic={m.middleManagement.byDemographic} />
          <BandFields prefix="junior" label="Junior management" total={m.juniorManagement.total} byDemographic={m.juniorManagement.byDemographic} />
          </div>
        </FormCard>
    </Shell>
  )
}
