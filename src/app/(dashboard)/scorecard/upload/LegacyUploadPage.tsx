import { FullScorecardExcelImport } from './FullScorecardExcelImport'

export default function LegacyUploadPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0c1a2e]">Full scorecard workbook</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Upload a Generic or legacy B-BBEE scorecard workbook to preview detected sheets, TMPS, procurement
          suppliers, and workbook coverage. For supplier-register–only files, use{' '}
          <span className="font-medium text-slate-800">New Procurement Assessment</span>.
        </p>
      </header>
      <FullScorecardExcelImport />
    </div>
  )
}
