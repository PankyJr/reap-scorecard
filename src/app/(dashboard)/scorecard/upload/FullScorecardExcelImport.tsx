'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { fullScorecardParseAction } from './fullScorecardParseAction'
import type {
  FullScorecardPreview,
  ScorecardSheetPresenceRow,
  ScorecardSummaryBlock,
  ScorecardSheetSummaryStatus,
} from '@/lib/scorecard-upload/types'
import {
  ChevronDown,
  FileSpreadsheet,
  LayoutGrid,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'

const INITIAL_SHEET_VISIBLE = 8

function truncate(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function kindLabel(kind: string): string {
  if (kind === 'full_scorecard') return 'Full scorecard workbook'
  if (kind === 'supplier_register_only') return 'Procurement supplier register'
  return 'Unrelated workbook'
}

/** UI-only status pills (parser / coverage unchanged). */
function coveragePillClass(coverage: ScorecardSheetPresenceRow['coverage']): string {
  switch (coverage) {
    case 'complete':
      return 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
    case 'summary':
      return 'border-sky-200/80 bg-sky-50 text-sky-900'
    case 'partial':
      return 'border-amber-200/80 bg-amber-50 text-amber-950'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700'
  }
}

function coveragePillLabel(coverage: ScorecardSheetPresenceRow['coverage']): string {
  switch (coverage) {
    case 'complete':
      return 'Row data'
    case 'summary':
      return 'Summary'
    case 'partial':
      return 'Partial'
    default:
      return 'Needs review'
  }
}

function blockStatusPillLabel(status: ScorecardSheetSummaryStatus): string {
  switch (status) {
    case 'row_data_detected':
      return 'Row data'
    case 'summary_detected':
      return 'Summary'
    case 'partial':
      return 'Partial'
    case 'empty_or_unclear':
      return 'Needs review'
    case 'missing_sheet':
      return 'Needs review'
    default:
      return 'Informational'
  }
}

function blockStatusPillClass(status: ScorecardSheetSummaryStatus): string {
  switch (status) {
    case 'row_data_detected':
      return 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
    case 'summary_detected':
      return 'border-sky-200/80 bg-sky-50 text-sky-900'
    case 'partial':
      return 'border-amber-200/80 bg-amber-50 text-amber-950'
    case 'empty_or_unclear':
    case 'missing_sheet':
      return 'border-slate-200 bg-slate-100 text-slate-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

function sheetFilterMatches(
  row: ScorecardSheetPresenceRow,
  filter: 'all' | 'row' | 'summary' | 'review',
): boolean {
  if (filter === 'all') return true
  if (filter === 'row') return row.coverage === 'complete'
  if (filter === 'summary') return row.coverage === 'summary'
  return row.coverage === 'partial' || row.coverage === 'missing'
}

function deriveOverviewMetrics(sheets: ScorecardSheetPresenceRow[]) {
  const sheetsDetected = sheets.filter((s) => s.actualSheetName != null).length
  const rowDataTabs = sheets.filter((s) => s.coverage === 'complete').length
  const summaryTabs = sheets.filter((s) => s.coverage === 'summary').length
  const needsReview = sheets.filter((s) => s.coverage === 'partial' || s.coverage === 'missing').length
  return { sheetsDetected, rowDataTabs, summaryTabs, needsReview }
}

function sheetRowSubtitle(row: ScorecardSheetPresenceRow): string {
  if (!row.actualSheetName) return 'No tab matched this expected register.'
  return `Matched as ${row.actualSheetName}`
}

function InterpretationAccordion({ title, block }: { title: string; block: ScorecardSummaryBlock }) {
  const trimmed = block.bullets.map((b) => b.trim()).filter(Boolean)
  const headline =
    trimmed[0] != null && trimmed[0] !== ''
      ? truncate(trimmed[0], 100)
      : 'No notes for this section.'
  return (
    <details className="group rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:border-slate-300/90 open:border-slate-200">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-[#0c1a2e]">{title}</span>
            <span
              className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${blockStatusPillClass(block.status)}`}
            >
              {blockStatusPillLabel(block.status)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug text-slate-500">{headline}</p>
        </div>
        <ChevronDown
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-slate-100 px-4 pb-4 pt-1">
        {block.figures?.length ? (
          <dl className="mb-3 space-y-1.5 text-xs text-slate-600">
            {block.figures.map((f) => (
              <div key={f.label} className="flex justify-between gap-3">
                <dt className="text-slate-500">{f.label}</dt>
                <dd className="font-medium text-slate-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {trimmed.length > 0 ? (
          <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-slate-600">
            {trimmed.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No additional detail.</p>
        )}
      </div>
    </details>
  )
}

function PreviewResults({
  preview,
  sheetFilter,
  setSheetFilter,
  showAllSheets,
  setShowAllSheets,
}: {
  preview: FullScorecardPreview
  sheetFilter: 'all' | 'row' | 'summary' | 'review'
  setSheetFilter: (v: 'all' | 'row' | 'summary' | 'review') => void
  showAllSheets: boolean
  setShowAllSheets: (v: boolean) => void
}) {
  const metrics = useMemo(() => deriveOverviewMetrics(preview.sheets), [preview.sheets])

  const filteredSheets = useMemo(
    () => preview.sheets.filter((r) => sheetFilterMatches(r, sheetFilter)),
    [preview.sheets, sheetFilter],
  )

  const visibleSheets = showAllSheets ? filteredSheets : filteredSheets.slice(0, INITIAL_SHEET_VISIBLE)
  const hasMoreSheets = filteredSheets.length > INITIAL_SHEET_VISIBLE

  const extraSupplierCount = Math.max(0, preview.procurement.supplierRowCount - preview.procurement.sampleSuppliers.length)

  const filterChip = (id: typeof sheetFilter, label: string) => (
    <button
      type="button"
      onClick={() => {
        setSheetFilter(id)
        setShowAllSheets(false)
      }}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        sheetFilter === id
          ? 'border-[#0b5259]/40 bg-[#0b5259]/8 text-[#0b5259]'
          : 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-10">
      {/* Workbook overview */}
      <section aria-labelledby="workbook-overview-heading">
        <h2 id="workbook-overview-heading" className="text-lg font-semibold tracking-tight text-[#0c1a2e]">
          Workbook overview
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Quick read on how this workbook matched our expected calculator layout.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Sheets detected', value: String(metrics.sheetsDetected), hint: 'Tabs matched in the file' },
            { label: 'Row-data tabs', value: String(metrics.rowDataTabs), hint: 'Line-level or register-style data' },
            { label: 'Summary tabs', value: String(metrics.summaryTabs), hint: 'Calculator / summary style' },
            { label: 'Needs review', value: String(metrics.needsReview), hint: 'Partial or missing matches' },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-3xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm ring-1 ring-slate-900/[0.02]"
            >
              <p className="text-xs font-semibold text-slate-600">{m.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#0c1a2e]">{m.value}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key findings */}
      <section aria-labelledby="key-findings-heading">
        <h2 id="key-findings-heading" className="text-lg font-semibold tracking-tight text-[#0c1a2e]">
          Key findings
        </h2>
        <p className="mt-1 text-sm text-slate-500">TMPS hint and procurement supplier preview.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02]">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-[#0c1a2e]">TMPS</h3>
              {preview.tmps.suggestedTotalDisplay ? (
                <span className="shrink-0 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                  Detected
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  Not detected
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-[#0c1a2e]">
              {preview.tmps.suggestedTotalDisplay ?? '—'}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {preview.tmps.suggestedTotalDisplay
                ? 'A TMPS-style total was found. Confirm it against your finance workbook before using it in an assessment.'
                : 'No TMPS-style total was inferred from this workbook. Expand sheet coverage or check the TMPS tab labels.'}
            </p>
          </div>

          <div className="rounded-3xl border border-[#0b5259]/15 bg-gradient-to-b from-white to-slate-50/50 p-5 shadow-sm ring-1 ring-[#0b5259]/10">
            <h3 className="text-base font-semibold text-[#0c1a2e]">Procurement suppliers</h3>
            <p className="mt-3 text-lg font-semibold text-[#0c1a2e]">
              {preview.procurement.supplierRowCount} supplier row{preview.procurement.supplierRowCount === 1 ? '' : 's'}{' '}
              detected
            </p>
            {preview.procurement.totalSpendDisplay ? (
              <p className="mt-1 text-sm text-slate-600">
                Mapped spend:{' '}
                <span className="font-semibold text-slate-900">{preview.procurement.totalSpendDisplay}</span>
              </p>
            ) : null}
            {preview.procurement.message ? (
              <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
                {preview.procurement.message}
              </p>
            ) : null}
            {preview.procurement.sampleSuppliers.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-slate-200/80 pt-4 text-sm text-slate-700">
                {preview.procurement.sampleSuppliers.map((s) => (
                  <li key={s.name} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate font-medium text-[#0c1a2e]">{s.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">{s.spendDisplay}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {extraSupplierCount > 0 ? (
              <p className="mt-3 text-xs font-medium text-slate-500">
                + {extraSupplierCount} more supplier{extraSupplierCount === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Sheet coverage */}
      <section aria-labelledby="sheet-coverage-heading">
        <h2 id="sheet-coverage-heading" className="text-lg font-semibold tracking-tight text-[#0c1a2e]">
          Sheet coverage
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Detected workbook tabs and how they were classified.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {filterChip('all', 'All')}
          {filterChip('row', 'Row data')}
          {filterChip('summary', 'Summary')}
          {filterChip('review', 'Needs review')}
        </div>
        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {visibleSheets.map((row) => (
              <li
                key={row.expectedLabel}
                className="flex items-start justify-between gap-3 px-4 py-3 transition hover:bg-slate-50/80"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0c1a2e]">{row.expectedLabel}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{sheetRowSubtitle(row)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${coveragePillClass(row.coverage)}`}
                >
                  {coveragePillLabel(row.coverage)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {hasMoreSheets ? (
          <button
            type="button"
            onClick={() => setShowAllSheets(!showAllSheets)}
            className="mt-3 text-sm font-semibold text-[#0b5259] hover:underline"
          >
            {showAllSheets ? 'Show less' : `Show all sheets (${filteredSheets.length})`}
          </button>
        ) : null}
      </section>

      {/* Workbook interpretation */}
      <section aria-labelledby="interpretation-heading">
        <h2 id="interpretation-heading" className="text-lg font-semibold tracking-tight text-[#0c1a2e]">
          Workbook interpretation
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Human-readable notes from the detected workbook structure. Expand a section for full detail.
        </p>
        <div className="mt-5 space-y-2.5">
          <InterpretationAccordion title="Ownership" block={preview.ownership} />
          <InterpretationAccordion title="Management control" block={preview.managementControl} />
          <InterpretationAccordion title="Employment equity" block={preview.employmentEquity} />
          <InterpretationAccordion title="Skills development" block={preview.skillsDevelopment} />
          <InterpretationAccordion title="ED & SD" block={preview.edSd} />
          <InterpretationAccordion title="SED" block={preview.sed} />
          <InterpretationAccordion title="Full scorecard" block={preview.fullScorecard} />
          <InterpretationAccordion title="NPAT" block={preview.npat} />
        </div>
      </section>

      {/* Other registers — collapsed, scrollable */}
      {preview.otherRegisters.bullets.length > 0 ? (
        <section aria-labelledby="additional-registers-heading">
          <details className="group rounded-3xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.02] open:border-slate-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
              <div>
                <h2 id="additional-registers-heading" className="text-base font-semibold text-[#0c1a2e]">
                  Additional register notes
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">EMP201, instructions, and learner-path tabs.</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-slate-100 px-5 pb-5 pt-2">
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-slate-600">
                  {preview.otherRegisters.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </section>
      ) : null}

      {preview.missingOrUnclearSections.length > 0 ? (
        <div className="rounded-3xl border border-amber-200/70 bg-amber-50/50 px-4 py-3.5 shadow-sm ring-1 ring-amber-900/[0.03]">
          <h2 className="text-sm font-semibold text-amber-950">Needs review</h2>
          <ul className="mt-1.5 space-y-1 text-sm leading-snug text-amber-950/90">
            {preview.missingOrUnclearSections.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-amber-900/75">
            Optional tabs are often partial here. This does not block the preview.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function FullScorecardExcelImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [workbookName, setWorkbookName] = useState<string | null>(null)
  const [kind, setKind] = useState<string | null>(null)
  const [guidance, setGuidance] = useState<string | null>(null)
  const [issues, setIssues] = useState<{ level: string; message: string }[]>([])
  const [preview, setPreview] = useState<FullScorecardPreview | null>(null)
  const [sheetFilter, setSheetFilter] = useState<'all' | 'row' | 'summary' | 'review'>('all')
  const [showAllSheets, setShowAllSheets] = useState(false)

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFile = useCallback((fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return
    setError(null)
    setPreview(null)
    setGuidance(null)
    setSheetFilter('all')
    setShowAllSheets(false)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fullScorecardParseAction(fd)
      if (!res.ok) {
        setError(res.issues.map((i) => i.message).join(' '))
        setWorkbookName(null)
        setKind(null)
        setIssues([])
        return
      }
      setWorkbookName(res.data.workbookName)
      setKind(res.data.workbookKind)
      setGuidance(res.data.guidance ?? null)
      setIssues(res.data.issues)
      setPreview(res.data.preview ?? null)
    })
  }, [])

  const emptyState = !workbookName

  return (
    <div className="space-y-8">
      {/* Hidden file input — used by empty state CTA and “Replace file” */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="sr-only"
        disabled={isPending}
        onChange={(e) => {
          onFile(e.target.files)
          e.target.value = ''
        }}
      />

      {emptyState ? (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-10">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/80">
              <Upload className="h-7 w-7 text-[#0b5259]" aria-hidden />
            </div>
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-[#0c1a2e]">Upload workbook</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Choose a Generic or legacy calculator workbook to inspect sheet coverage and import readiness.
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={openFilePicker}
              className={buttonStyles({
                variant: 'primary',
                size: 'md',
                className: 'mt-8 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-2.5 font-semibold',
              })}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Choose Excel file
            </button>
            <p className="mt-3 text-xs text-slate-400">.xlsx or .xls</p>
            <p className="mt-8 text-xs leading-relaxed text-slate-500">
              This preview does not save data or replace the procurement supplier import.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Sheet coverage',
                body: 'See which expected tabs are present and how they classify.',
                icon: LayoutGrid,
              },
              {
                title: 'TMPS hint',
                body: 'Surface a TMPS-style total when the workbook suggests one.',
                icon: Sparkles,
              },
              {
                title: 'Procurement suppliers',
                body: 'Preview mapped supplier rows when a register is detected.',
                icon: Users,
              },
              {
                title: 'Summary tabs',
                body: 'Distinguish calculator summaries from row-level registers.',
                icon: Layers,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 text-left shadow-none"
              >
                <item.icon className="h-4 w-4 text-[#0b5259]" aria-hidden />
                <p className="mt-3 text-xs font-semibold text-slate-700">{item.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Uploaded file strip */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/80">
                  <FileSpreadsheet className="h-5 w-5 text-[#0b5259]" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0c1a2e]">{workbookName}</p>
                  <p className="text-xs text-slate-500">{kindLabel(kind ?? '')}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={openFilePicker}
                className={buttonStyles({
                  variant: 'secondary',
                  size: 'sm',
                  className: 'inline-flex shrink-0 items-center gap-2 rounded-xl',
                })}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Replace file
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Preview only — nothing is saved. Use{' '}
              <span className="font-medium text-slate-600">New Procurement Assessment</span> for supplier-register
              imports.
            </p>
          </div>

          {error ? (
            <div
              className="rounded-3xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {issues.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {issues.map((i, idx) => (
                <span
                  key={idx}
                  className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-medium ${
                    i.level === 'error'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : i.level === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-950'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="capitalize">{i.level}</span>
                  <span className="mx-1 text-slate-400">·</span>
                  <span className="font-normal">{i.message}</span>
                </span>
              ))}
            </div>
          ) : null}

          {guidance ? (
            <div className="rounded-3xl border border-slate-200/90 bg-slate-50/80 px-5 py-4 text-sm leading-relaxed text-slate-700">
              {guidance}
            </div>
          ) : null}

          {preview ? (
            <PreviewResults
              preview={preview}
              sheetFilter={sheetFilter}
              setSheetFilter={setSheetFilter}
              showAllSheets={showAllSheets}
              setShowAllSheets={setShowAllSheets}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
