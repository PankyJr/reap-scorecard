'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  Upload,
} from 'lucide-react'
import { ProcurementScorecardTable } from '@/components/procurement/ProcurementScorecardTable'
import type { ProcurementAssessmentResult } from '@/lib/procurement/assessment'
import { PROCUREMENT_MAX_POINTS } from '@/lib/procurement/insights'
import {
  formatCurrency,
  formatCurrencyZar,
  formatPercentFromRatio,
  formatPoints,
} from '@/lib/procurement/format'
import {
  tmpsDenominatorSourceShortNote,
  tmpsDenominatorSourceTitle,
  type ProcurementTmpsDenominatorSource,
} from '@/lib/procurement/tmpsDenominator'
import { buildSuppliersFromMappedSheet } from '@/lib/procurement/excel/buildSuppliers'
import type {
  ProcurementExcelColumnMapping,
  ProcurementExcelParseIssue,
  ProcurementExcelParseSuccess,
} from '@/lib/procurement/excel/types'
import { PROCUREMENT_EXCEL_FIELD_META } from '@/lib/procurement/excel/types'
import type { ProcurementSupplierInput } from '@/lib/procurement/rows'
import { cn } from '@/components/marketing/cn'
import {
  marketingPreviewAssessment,
  marketingPreviewBbbeeShare,
  marketingPreviewDenominator,
  marketingPreviewSupplierRows,
  mappingFromAuto,
} from '@/components/marketing/marketingWorkbookPreview'
import { MARKETING_DEMO_SUPPLIER_SNIPPET } from '@/components/marketing/marketingProcurementPreviewData'
import { parseMarketingProcurementFile } from '@/components/marketing/parseMarketingProcurementFile'
import { buttonStyles } from '@/components/ui/buttonStyles'

const WORKFLOW_STEPS = [
  { id: 'upload', label: 'Upload procurement workbook', shortLabel: 'Upload' },
  { id: 'map', label: 'Map supplier columns', shortLabel: 'Map columns' },
  { id: 'tmps', label: 'Choose TMPS denominator', shortLabel: 'TMPS' },
  { id: 'preview', label: 'Preview scorecard', shortLabel: 'Preview' },
  { id: 'export', label: 'Export PDF', shortLabel: 'Export' },
] as const

const MOBILE_NEXT_LABEL: Record<StepId, string> = {
  upload: 'Next',
  map: 'Next',
  tmps: 'Preview',
  preview: 'Export',
  export: 'Sign in',
}

type StepId = (typeof WORKFLOW_STEPS)[number]['id']

const DEMO_HEADERS = [
  'Supplier Name',
  'B-BBEE Spend (ex VAT)',
  'Level',
  'Black Owned',
  'Supplier Type',
] as const

const DEFAULT_MAPPING: ProcurementExcelColumnMapping = {
  supplier_name: 'Supplier Name',
  spend_amount: 'B-BBEE Spend (ex VAT)',
  bbb_level: 'Level',
}

/** Marketing-only copy for the map-step preview when sample workbook is active. */
const MARKETING_MAP_PREVIEW = {
  workbookLabel: 'Procurement test.xlsx',
  sheetLabel: 'Procurement',
  rowCount: 908,
  suggestions: [
    { source: 'Vendor', field: 'supplier_name' as const },
    { source: 'ZAR', field: 'spend_amount' as const },
    { source: 'B-BBEE Level', field: 'bbb_level' as const },
    { source: 'Black Ownership %', field: 'black_ownership' as const },
    { source: 'Black Women Ownership %', field: 'black_women_ownership' as const },
  ],
}

const LOGIN_NEW_ASSESSMENT = '/login?next=%2Fprocurement%2Fassessments%2Fnew'

const mapSelectClassDark =
  'w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/40 focus:ring-4 focus:ring-white/10'

function mapPanelClass(darkSurface: boolean) {
  return cn(
    'rounded-2xl border',
    darkSurface ? 'border-white/12 bg-white/[0.04]' : 'border-slate-200/90 bg-slate-50/80',
  )
}

const premiumTabListClass =
  'flex overflow-x-auto rounded-xl border border-white/12 bg-[#0a0a0a] scrollbar-hide'

const tmpsInputClass =
  'w-full rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0b5259]/70 focus:ring-4 focus:ring-[#0b5259]/15'

const tmpsInputClassDark =
  'w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/40 focus:ring-4 focus:ring-white/10'

const previewFooterBtnBase =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none'

function previewFooterSecondaryClass(disabled?: boolean) {
  return cn(
    previewFooterBtnBase,
    'border border-white/50 bg-white/10 text-white hover:border-white/70 hover:bg-white/20',
    disabled && 'opacity-50',
  )
}

function previewFooterPrimaryClass(disabled?: boolean) {
  return cn(
    previewFooterBtnBase,
    disabled
      ? 'border border-white/40 bg-white/20 text-white/90'
      : 'border border-white bg-white text-black hover:bg-white/90',
  )
}

function tmpsOptionButtonClass(darkSurface: boolean, selected: boolean) {
  if (darkSurface) {
    return cn(
      'rounded-2xl border px-4 py-3 text-left text-sm transition',
      selected
        ? 'border-white/55 bg-white text-slate-900 shadow-sm ring-2 ring-white/20'
        : 'border-white/22 bg-white/[0.07] hover:border-white/40 hover:bg-white/[0.11]',
    )
  }
  return cn(
    'rounded-2xl border px-4 py-3 text-left text-sm transition',
    selected
      ? 'border-[#0b5259] bg-[#0b5259]/10 ring-2 ring-[#0b5259]/30'
      : 'border-slate-200 bg-white hover:border-slate-300',
  )
}

function tmpsOptionTitleClass(darkSurface: boolean, selected: boolean) {
  if (darkSurface) {
    return cn('font-semibold', selected ? 'text-slate-900' : 'text-white')
  }
  return 'font-semibold text-slate-900'
}

function tmpsOptionSubtitleClass(darkSurface: boolean, selected: boolean) {
  return cn(
    'mt-0.5 text-[11px] font-semibold uppercase tracking-wide',
    darkSurface ? (selected ? 'text-slate-500' : 'text-white/60') : 'text-slate-500',
  )
}

export function MarketingScorecardSystemPreview({
  className,
  embeddedInHero = false,
  hideIntro = false,
}: {
  className?: string
  embeddedInHero?: boolean
  /** When true, parent section supplies intro copy and premium shell styling applies. */
  hideIntro?: boolean
}) {
  const premiumShell = hideIntro && !embeddedInHero
  const [activeStep, setActiveStep] = useState<StepId>('upload')
  const [workbookName, setWorkbookName] = useState<string | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [workbookParse, setWorkbookParse] = useState<ProcurementExcelParseSuccess | null>(null)
  const [parseIssues, setParseIssues] = useState<ProcurementExcelParseIssue[]>([])
  const [useDemoDataset, setUseDemoDataset] = useState(false)
  const [builtSuppliers, setBuiltSuppliers] = useState<ProcurementSupplierInput[]>([])
  const [mapping, setMapping] = useState<ProcurementExcelColumnMapping>({ ...DEFAULT_MAPPING })
  const [mappingApplied, setMappingApplied] = useState(false)
  const [assessmentYear, setAssessmentYear] = useState(2026)
  const [tmpsSource, setTmpsSource] =
    useState<ProcurementTmpsDenominatorSource>('import_supplier_total')
  const [scorePreviewReady, setScorePreviewReady] = useState(false)
  const [exportReady, setExportReady] = useState(false)

  const stepIndex = WORKFLOW_STEPS.findIndex((s) => s.id === activeStep)
  const importBlocked = Boolean(workbookParse?.supplierImportBlockedReason)

  const denominator = useMemo(
    () =>
      marketingPreviewDenominator({
        tmpsSource,
        builtSuppliers,
        parse: workbookParse,
        useDemoDataset,
      }),
    [tmpsSource, builtSuppliers, workbookParse, useDemoDataset],
  )

  const assessmentLive = useMemo(
    () =>
      marketingPreviewAssessment({
        scorePreviewReady,
        builtSuppliers,
        denominator,
        useDemoDataset,
      }),
    [scorePreviewReady, builtSuppliers, denominator, useDemoDataset],
  )

  const preview = assessmentLive?.result ?? null
  const recognisedSpend = assessmentLive?.recognisedSpend ?? 0
  const tmpsNote = tmpsDenominatorSourceTitle(tmpsSource)
  const bbbeeShare = marketingPreviewBbbeeShare(recognisedSpend, denominator, useDemoDataset)

  const previewRows = useMemo(
    () =>
      marketingPreviewSupplierRows({
        builtSuppliers,
        parse: workbookParse,
        mapping,
        useDemoDataset,
      }),
    [builtSuppliers, workbookParse, mapping, useDemoDataset],
  )

  const supplierRowCount =
    builtSuppliers.length > 0
      ? builtSuppliers.length
      : workbookParse && !importBlocked
        ? workbookParse.totalRowCountInSheet
        : useDemoDataset
          ? 24
          : 0

  const previewRowsInFile =
    workbookParse && !importBlocked
      ? workbookParse.totalRowCountInSheet
      : useDemoDataset
        ? MARKETING_MAP_PREVIEW.rowCount
        : supplierRowCount

  const previewWorkbookLabel =
    useDemoDataset && workbookName ? MARKETING_MAP_PREVIEW.workbookLabel : workbookName

  const previewSheetLabel =
    useDemoDataset && !workbookParse?.selectedSheetName
      ? MARKETING_MAP_PREVIEW.sheetLabel
      : workbookParse?.selectedSheetName ?? null

  const canGoMap = Boolean(workbookName)
  const canGoTmps = canGoMap && mappingApplied
  const canGoPreview = canGoTmps && scorePreviewReady
  const canGoExport = canGoPreview && exportReady

  function resetDownstream(from: 'upload' | 'map' | 'tmps') {
    if (from === 'upload') {
      setMappingApplied(false)
      setBuiltSuppliers([])
    }
    if (from === 'upload' || from === 'map') {
      setScorePreviewReady(false)
    }
    setExportReady(false)
  }

  function canAccessStep(stepId: StepId): boolean {
    switch (stepId) {
      case 'upload':
        return true
      case 'map':
        return canGoMap
      case 'tmps':
        return canGoTmps
      case 'preview':
        return canGoPreview
      case 'export':
        return canGoExport
      default:
        return false
    }
  }

  function goToStep(stepId: StepId) {
    if (!canAccessStep(stepId)) return
    setActiveStep(stepId)
  }

  function loadDemoWorkbook() {
    setUseDemoDataset(true)
    setWorkbookParse(null)
    setParseIssues([])
    setBuiltSuppliers([])
    setWorkbookName('Procurement_Register_FY2026.xlsx')
    setMapping({ ...DEFAULT_MAPPING })
    setTmpsSource('calculated')
    resetDownstream('upload')
    setIsReadingFile(false)
  }

  async function processUploadedFile(file: File) {
    setIsReadingFile(true)
    setUseDemoDataset(false)
    setBuiltSuppliers([])
    resetDownstream('upload')

    try {
      const result = await parseMarketingProcurementFile(file)

      if (!result.ok) {
        setWorkbookName(file.name)
        setWorkbookParse(null)
        setParseIssues(result.issues)
        setMapping({ ...DEFAULT_MAPPING })
        return
      }

      setWorkbookName(result.workbookName)
      setWorkbookParse(result)
      setParseIssues(result.issues)
      setMapping(mappingFromAuto(result.autoMapping))

      if (result.supplierImportBlockedReason) {
        setMappingApplied(false)
        return
      }

      if (result.totalRowCountInSheet > 0) {
        setTmpsSource(
          result.suggestedTmpsTotal != null ? 'calculated' : 'import_supplier_total',
        )
      }
    } catch {
      setWorkbookName(file.name)
      setWorkbookParse(null)
      setParseIssues([
        {
          level: 'error',
          message: 'Could not read this file. Try saving as .xlsx and upload again.',
        },
      ])
    } finally {
      setIsReadingFile(false)
    }
  }

  function onFileChange(file: File | undefined) {
    if (!file) return
    void processUploadedFile(file)
  }

  function applyMapping() {
    resetDownstream('map')

    if (useDemoDataset) {
      setBuiltSuppliers([])
      setMappingApplied(true)
      setActiveStep('tmps')
      return
    }

    if (!workbookParse || importBlocked) {
      return
    }

    const built = buildSuppliersFromMappedSheet({
      headers: workbookParse.columnHeaders,
      dataRows: workbookParse.dataRows,
      mapping,
    })

    setBuiltSuppliers(built.suppliers)
    setMappingApplied(built.suppliers.length > 0)
    setParseIssues((prev) => [...prev, ...built.issues])

    if (built.suppliers.length > 0) {
      setActiveStep('tmps')
    }
  }

  function handleTmpsSourceChange(source: ProcurementTmpsDenominatorSource) {
    setTmpsSource(source)
    setScorePreviewReady(false)
    setExportReady(false)
  }

  function goNext() {
    const next = WORKFLOW_STEPS[stepIndex + 1]
    if (!next) return
    if (next.id === 'map' && !canGoMap) return
    if (next.id === 'tmps' && !canGoTmps) return
    if (next.id === 'preview') {
      if (!canGoTmps) return
      setScorePreviewReady(true)
    }
    if (next.id === 'export') {
      if (!canGoPreview) return
      setExportReady(true)
    }
    setActiveStep(next.id)
  }

  function goPrev() {
    const prev = WORKFLOW_STEPS[stepIndex - 1]
    if (prev) setActiveStep(prev.id)
  }

  useEffect(() => {
    if (activeStep === 'preview' && !canGoPreview) {
      setActiveStep(canGoTmps ? 'tmps' : canGoMap ? 'map' : 'upload')
    } else if (activeStep === 'export' && !canGoExport) {
      setActiveStep(canGoPreview ? 'preview' : canGoTmps ? 'tmps' : canGoMap ? 'map' : 'upload')
    }
  }, [activeStep, canGoExport, canGoMap, canGoPreview, canGoTmps])

  const activeStepMeta = WORKFLOW_STEPS[stepIndex]
  const stepProgressPct = ((stepIndex + 1) / WORKFLOW_STEPS.length) * 100

  const stepTabsMobile =
    premiumShell && !embeddedInHero ? (
      <div
        className="border-b border-white/10 bg-black px-4 py-3 lg:hidden"
        role="tablist"
        aria-label="Procurement assessment workflow steps"
      >
        <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-white/75">
          <span>
            Step {stepIndex + 1} of {WORKFLOW_STEPS.length}
          </span>
          <span className="tabular-nums">{Math.round(stepProgressPct)}%</span>
        </div>
        <div className="mt-2 h-px overflow-hidden bg-white/10">
          <div
            className="h-full bg-white/45 transition-[width] duration-300"
            style={{ width: `${stepProgressPct}%` }}
            aria-hidden
          />
        </div>
        <p className="mt-2.5 text-sm font-semibold leading-snug tracking-[-0.01em] text-white">
          {activeStepMeta.label}
        </p>
        <div className={cn('mt-3', premiumTabListClass)}>
          {WORKFLOW_STEPS.map((step, index) => {
            const isActive = step.id === activeStep
            const isAccessible = canAccessStep(step.id)
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-disabled={!isAccessible}
                aria-controls={`preview-panel-${step.id}`}
                onClick={() => goToStep(step.id)}
                disabled={!isAccessible}
                className={cn(
                  'shrink-0 border-r border-white/12 px-2.5 py-2 text-[10px] font-medium tracking-wide transition last:border-r-0',
                isActive
                  ? 'bg-white/[0.14] text-white'
                  : isAccessible
                    ? 'bg-transparent text-white/65 hover:bg-white/[0.06] hover:text-white/90'
                    : 'cursor-not-allowed bg-transparent text-white/35',
                )}
              >
                {index + 1}. {step.shortLabel}
              </button>
            )
          })}
        </div>
      </div>
    ) : null

  const stepTabs = (
    <div
      className={cn(
        'flex',
        embeddedInHero
          ? premiumTabListClass
          : premiumShell
            ? cn(
                premiumTabListClass,
                'mx-4 mt-4 hidden sm:mx-6 sm:mt-5 lg:mx-6 lg:flex lg:overflow-hidden',
              )
            : 'mt-6 gap-0 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1 scrollbar-hide sm:flex-wrap sm:overflow-visible',
      )}
      role="tablist"
      aria-label="Procurement assessment workflow steps"
    >
      {WORKFLOW_STEPS.map((step, index) => {
        const isActive = step.id === activeStep
        const isAccessible = canAccessStep(step.id)
        const isComplete =
          (step.id === 'upload' && canGoMap) ||
          (step.id === 'map' && canGoTmps) ||
          (step.id === 'tmps' && scorePreviewReady) ||
          (step.id === 'preview' && exportReady)

        if (embeddedInHero || premiumShell) {
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={!isAccessible}
              aria-controls={`preview-panel-${step.id}`}
              onClick={() => goToStep(step.id)}
              disabled={!isAccessible}
              className={cn(
                'shrink-0 border-r border-white/12 px-3.5 py-2.5 text-left text-[11px] font-medium leading-snug tracking-[-0.01em] transition last:border-r-0 sm:px-4 sm:py-3 sm:text-xs',
                isActive
                  ? 'bg-white/[0.14] text-white'
                  : isAccessible
                    ? 'bg-transparent text-white/65 hover:bg-white/[0.06] hover:text-white/90'
                    : 'cursor-not-allowed bg-transparent text-white/35',
              )}
            >
              {step.label}
            </button>
          )
        }

        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={!isAccessible}
            aria-controls={`preview-panel-${step.id}`}
            onClick={() => goToStep(step.id)}
            disabled={!isAccessible}
            className={cn(
              'flex min-w-[9.5rem] max-w-[13rem] shrink-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition sm:min-w-0',
              isActive
                ? 'border-[#05363A]/30 bg-white text-[#05363A] shadow-sm'
                : isAccessible
                  ? 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white/70 hover:text-slate-900'
                  : 'cursor-not-allowed border-transparent bg-transparent text-slate-400 opacity-60',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                isActive
                  ? 'bg-[#05363A] text-white'
                  : isComplete
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600',
              )}
            >
              {isComplete && !isActive ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                index + 1
              )}
            </span>
            <span className="text-[11px] font-semibold leading-snug text-inherit sm:text-xs">
              {step.label}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className={cn('max-w-full overflow-hidden text-left', className)}>
      {!embeddedInHero && !hideIntro ? (
        <>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#05363A]">
            Interactive system preview
          </p>
          <p className="mt-2 text-center text-sm text-slate-600">
            Walk through the procurement assessment flow — sample data only
          </p>
        </>
      ) : null}

      <div
        className={cn(
          premiumShell &&
            'overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_32px_64px_-28px_rgba(0,0,0,0.45)] ring-1 ring-white/5',
        )}
      >
        {stepTabsMobile}
        {stepTabs}

        <div
          className={cn(
            embeddedInHero
              ? 'overflow-hidden bg-white'
              : premiumShell
                ? 'grid bg-black lg:min-h-[min(520px,72vh)] lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-stretch'
                : 'mt-8 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(0,0,0,0.12)] lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]',
          )}
        >
        <div
          className={cn(
            'flex min-w-0 flex-col',
            premiumShell ? 'bg-black lg:min-h-0' : 'bg-white',
            !embeddedInHero && (premiumShell ? 'lg:border-r lg:border-white/10' : 'lg:border-r lg:border-slate-200/80'),
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 border-b px-4 py-2.5 sm:px-5',
              embeddedInHero
                ? 'border-slate-200/80 bg-slate-50'
                : premiumShell
                  ? 'border-white/10 bg-black'
                  : 'border-slate-200 bg-[#0f1419]',
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" aria-hidden />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" aria-hidden />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" aria-hidden />
            <div className="ml-2 min-w-0 flex-1">
              <p
                className={cn(
                  'truncate text-[11px] font-medium',
                  embeddedInHero ? 'text-slate-600' : 'text-white/90',
                )}
              >
                REAP Scorecard · Procurement assessment
              </p>
              {!embeddedInHero ? (
                <p className="truncate text-[10px] text-white/55">Sample workbook · FY2026</p>
              ) : null}
            </div>
          </div>
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col',
              premiumShell && 'min-h-[420px] sm:min-h-[440px] lg:min-h-0',
            )}
          >
            <div
              id={`preview-panel-${activeStep}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeStep}`}
              className={cn(
                'min-w-0 flex-1 px-4 sm:px-6',
                embeddedInHero
                  ? 'py-4 sm:py-5'
                  : premiumShell
                    ? 'flex min-h-0 flex-col bg-black px-4 py-4 sm:px-7 sm:py-5'
                    : 'min-h-[320px] py-5 sm:min-h-[380px] sm:py-6',
              )}
            >
          {activeStep === 'upload' && (
            <UploadStepPanel
              darkSurface={premiumShell}
              fillHeight={premiumShell && !embeddedInHero}
              compact={embeddedInHero}
              workbookName={workbookName}
              isReadingFile={isReadingFile}
              parse={workbookParse}
              parseIssues={parseIssues}
              useDemoDataset={useDemoDataset}
              importBlocked={importBlocked}
              onFileChange={onFileChange}
              onUseSample={loadDemoWorkbook}
            />
          )}

          {activeStep === 'map' && (
            <MapStepPanel
              darkSurface={premiumShell}
              fillHeight={premiumShell && !embeddedInHero}
              workbookName={workbookName}
              sheetName={previewSheetLabel}
              displayWorkbookName={previewWorkbookLabel}
              columnHeaders={
                workbookParse?.columnHeaders?.length
                  ? workbookParse.columnHeaders
                  : [...DEMO_HEADERS]
              }
              mapping={mapping}
              onMappingChange={(next) => {
                setMapping(next)
                if (mappingApplied) resetDownstream('map')
              }}
              onApply={applyMapping}
              mappingApplied={mappingApplied}
              rowsInFile={previewRowsInFile}
              useDemoSuggestions={useDemoDataset && !workbookParse?.columnHeaders?.length}
              importBlocked={importBlocked}
            />
          )}

          {activeStep === 'tmps' && (
            <TmpsStepPanel
              darkSurface={premiumShell}
              assessmentYear={assessmentYear}
              onAssessmentYearChange={setAssessmentYear}
              tmpsSource={tmpsSource}
              onTmpsSourceChange={handleTmpsSourceChange}
              denominator={denominator}
              tmpsNote={tmpsNote}
              scorePreviewReady={scorePreviewReady}
            />
          )}

          {activeStep === 'preview' &&
            (canGoPreview && preview ? (
              <PreviewStepPanel
                darkSurface={premiumShell}
                preview={preview}
                tmpsNote={tmpsNote}
                denominator={denominator}
                bbbeeShare={bbbeeShare}
                recognisedSpend={recognisedSpend}
                fromUploadedWorkbook={assessmentLive?.fromUploadedWorkbook ?? false}
              />
            ) : (
              <WorkflowLockedPanel
                darkSurface={premiumShell}
                title="Score preview not ready yet"
                description="Upload your workbook, apply column mappings, then choose a TMPS denominator and click Next to calculate procurement points."
                checklist={[
                  { done: canGoMap, label: 'Upload a procurement workbook' },
                  { done: canGoTmps, label: 'Map supplier columns and apply mappings' },
                  { done: scorePreviewReady, label: 'Confirm TMPS and continue to preview' },
                ]}
                actionLabel={canGoTmps ? 'Go to TMPS step' : canGoMap ? 'Go to column mapping' : 'Start with upload'}
                onAction={() =>
                  goToStep(canGoTmps ? 'tmps' : canGoMap ? 'map' : 'upload')
                }
              />
            ))}

          {activeStep === 'export' &&
            (canGoExport ? (
              <ExportStepPanel darkSurface={premiumShell} />
            ) : (
              <WorkflowLockedPanel
                darkSurface={premiumShell}
                title="Export unlocks after preview"
                description="Walk through the sample assessment through the score preview step first. PDF export in the live app uses the same calculated results."
                checklist={[
                  { done: canGoMap, label: 'Upload a procurement workbook' },
                  { done: canGoTmps, label: 'Map supplier columns' },
                  { done: scorePreviewReady, label: 'Generate score preview from TMPS' },
                  { done: exportReady, label: 'Continue from preview to export' },
                ]}
                actionLabel={canGoPreview ? 'Go to score preview' : 'Continue the workflow'}
                onAction={() => goToStep(canGoPreview ? 'preview' : canGoTmps ? 'tmps' : 'upload')}
              />
            ))}
            </div>

            <div
              className={cn(
                premiumShell
                  ? 'mt-auto grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-white/10 bg-black px-4 py-2.5 sm:px-7'
                  : 'flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6',
                embeddedInHero && 'py-2.5',
              )}
            >
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIndex === 0}
            className={
              premiumShell
                ? previewFooterSecondaryClass(stepIndex === 0)
                : buttonStyles({
                    variant: 'secondary',
                    size: 'sm',
                    className: cn('shrink-0', stepIndex === 0 && 'opacity-40'),
                  })
            }
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <p
            className={cn(
              'text-center text-[11px] sm:text-xs',
              premiumShell ? 'text-white/70 lg:hidden' : 'text-slate-500',
              premiumShell && 'lg:hidden',
            )}
          >
            Step {stepIndex + 1} of {WORKFLOW_STEPS.length}
          </p>

          {activeStep === 'export' ? (
            <Link
              href={LOGIN_NEW_ASSESSMENT}
              className={
                premiumShell
                  ? previewFooterPrimaryClass(false)
                  : buttonStyles({ variant: 'primary', size: 'sm' })
              }
            >
              Sign in to run assessments
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={
                (activeStep === 'upload' && !canGoMap) ||
                (activeStep === 'map' && !canGoTmps) ||
                (activeStep === 'tmps' && !canGoTmps) ||
                (activeStep === 'preview' && !canGoPreview)
              }
              className={
                premiumShell
                  ? previewFooterPrimaryClass(
                      (activeStep === 'upload' && !canGoMap) ||
                        (activeStep === 'map' && !canGoTmps) ||
                        (activeStep === 'tmps' && !canGoTmps) ||
                        (activeStep === 'preview' && !canGoPreview),
                    )
                  : buttonStyles({
                      variant: 'primary',
                      size: 'sm',
                      className: cn(
                        ((activeStep === 'upload' && !canGoMap) ||
                          (activeStep === 'map' && !canGoTmps) ||
                          (activeStep === 'tmps' && !canGoTmps) ||
                          (activeStep === 'preview' && !canGoPreview)) &&
                          'opacity-40',
                      ),
                    })
              }
            >
              {premiumShell ? (
                <>
                  <span className="sm:hidden">{MOBILE_NEXT_LABEL[activeStep]}</span>
                  <span className="hidden sm:inline">
                    {activeStep === 'upload'
                      ? 'Continue to mapping'
                      : activeStep === 'map'
                        ? 'Continue to TMPS'
                        : activeStep === 'tmps'
                          ? 'Generate score preview'
                          : activeStep === 'preview'
                            ? 'Continue to export'
                            : 'Next'}
                  </span>
                </>
              ) : activeStep === 'upload' ? (
                'Continue to mapping'
              ) : activeStep === 'map' ? (
                'Continue to TMPS'
              ) : activeStep === 'tmps' ? (
                'Generate score preview'
              ) : activeStep === 'preview' ? (
                'Continue to export'
              ) : (
                'Next'
              )}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          )}
            </div>
          </div>
        </div>

        {!embeddedInHero ? (
          <div className={cn(premiumShell && 'hidden h-full min-h-0 lg:block')}>
            <MarketingPreviewSideRail
              activeStep={activeStep}
              workbookName={previewWorkbookLabel ?? workbookName}
              canGoMap={canGoMap}
              canGoTmps={canGoTmps}
              canGoPreview={canGoPreview}
              denominator={denominator}
              preview={preview}
              bbbeeShare={bbbeeShare}
              tmpsNote={tmpsNote}
              previewRows={previewRows}
              rowsInFile={previewRowsInFile}
              supplierRowCount={supplierRowCount}
              executive={premiumShell}
            />
          </div>
        ) : null}
        </div>
      </div>

      {!embeddedInHero && !hideIntro ? (
        <p className="mt-4 text-center text-xs text-slate-600">
          Interactive preview with sample data ·{' '}
          <Link
            href={LOGIN_NEW_ASSESSMENT}
            className="font-medium text-[#05363A] underline decoration-[#05363A]/35 hover:decoration-[#05363A]"
          >
            Sign in
          </Link>{' '}
          for your companies
        </p>
      ) : null}
    </div>
  )
}

function MarketingPreviewSideRail({
  activeStep,
  workbookName,
  canGoMap,
  canGoTmps,
  canGoPreview,
  denominator,
  preview,
  bbbeeShare,
  tmpsNote,
  previewRows,
  rowsInFile,
  supplierRowCount,
  executive = false,
}: {
  activeStep: StepId
  workbookName: string | null
  canGoMap: boolean
  canGoTmps: boolean
  canGoPreview: boolean
  denominator: number
  preview: ProcurementAssessmentResult | null
  bbbeeShare: number
  tmpsNote: string
  previewRows: { name: string; spend: number; level: string }[]
  rowsInFile: number
  supplierRowCount: number
  executive?: boolean
}) {
  const topCategories = preview?.categories.slice(0, executive ? 3 : 4) ?? []
  const hasLiveRows = previewRows.length > 0
  const displayRows = hasLiveRows
    ? executive
      ? previewRows.slice(0, 4)
      : previewRows
    : MARKETING_DEMO_SUPPLIER_SNIPPET.map((row) => ({
        name: row.name,
        spend: row.spend,
        level: row.level,
      }))
  const isSamplePreview = !hasLiveRows
  const workbookLoaded = Boolean(workbookName) || canGoMap
  const registerStatus = hasLiveRows
    ? supplierRowCount > 0
      ? `${supplierRowCount} row${supplierRowCount === 1 ? '' : 's'}`
      : 'Loaded'
    : workbookLoaded && rowsInFile > 0
      ? `${rowsInFile} rows`
      : workbookLoaded
        ? 'Loaded'
        : 'Waiting'

  return (
    <aside
      className={cn(
        'flex h-full flex-col',
        executive
          ? 'bg-black p-5 sm:p-6 lg:min-h-0 lg:border-l lg:border-white/10 lg:p-6'
          : 'bg-gradient-to-b from-slate-50 to-slate-100/90 p-4 sm:p-5 lg:min-h-[420px]',
      )}
    >
      <p
        className={cn(
          'font-semibold uppercase tracking-[0.2em] text-[#05363A]',
          executive ? 'text-[11px] text-emerald-300' : 'text-[10px]',
        )}
      >
        Live sample output
      </p>
      <p
        className={cn(
          'mt-2 leading-relaxed',
          executive ? 'text-sm text-white/65' : 'text-xs text-slate-600',
        )}
      >
        {isSamplePreview
          ? 'Sample supplier lines shown below illustrate what appears after you upload a procurement workbook.'
          : 'Supplier register and score snapshot from your preview workflow. Sample data only — nothing is saved.'}
      </p>

      <div
        className={cn(
          'mt-4 border shadow-sm',
          executive
            ? 'rounded-2xl border-white/15 bg-white/5 p-4 sm:p-5'
            : 'rounded-xl border-slate-200/90 bg-white p-3',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p
            className={cn(
              'font-semibold uppercase tracking-wide',
              executive ? 'text-[11px] text-white/50' : 'text-[10px] text-slate-500',
            )}
          >
            Supplier register
          </p>
          <span
            className={cn(
              'font-medium uppercase tracking-wide',
              executive
                ? 'rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/65'
                : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600',
            )}
          >
            {registerStatus}
          </span>
        </div>
        <p
          className={cn(
            'mt-2',
            executive ? 'text-xs text-white/55' : 'text-[11px] text-slate-500',
          )}
        >
          {workbookName ? (
            <span className={cn('font-medium', executive && 'text-white/80')}>{workbookName}</span>
          ) : (
            'No workbook loaded'
          )}
        </p>
        {isSamplePreview ? (
          <p className={cn('mt-1 text-[10px]', executive ? 'text-white/40' : 'text-slate-400')}>
            {activeStep === 'map' || activeStep === 'tmps' || activeStep === 'preview' || activeStep === 'export'
              ? 'Sample lines from uploaded workbook'
              : 'Preview · sample supplier lines'}
          </p>
        ) : null}
        <div
          className={cn(
            'mt-3 overflow-hidden border',
            executive ? 'rounded-xl border-white/15' : 'rounded-lg border-slate-100/90',
            isSamplePreview && executive && 'opacity-90',
          )}
        >
          <table className={cn('w-full text-left', executive ? 'text-xs' : 'text-[10px]')}>
            <thead
              className={cn(
                executive ? 'bg-white/10 text-white/75' : 'bg-slate-100/70 text-slate-600',
              )}
            >
              <tr>
                <th className={cn('font-semibold', executive ? 'px-4 py-3' : 'px-2 py-1.5')}>Supplier</th>
                <th
                  className={cn(
                    'font-semibold text-right',
                    executive ? 'px-4 py-3' : 'px-2 py-1.5',
                  )}
                >
                  Spend
                </th>
                <th className={cn('font-semibold', executive ? 'px-4 py-3' : 'px-2 py-1.5')}>Level</th>
              </tr>
            </thead>
            <tbody className={cn('divide-y', executive ? 'divide-white/10' : 'divide-slate-100')}>
              {displayRows.map((row) => (
                <tr key={`${row.name}-${row.spend}`}>
                  <td
                    className={cn(
                      'max-w-[9rem] truncate font-medium',
                      executive ? 'max-w-[10rem] px-4 py-2.5 text-white/90' : 'max-w-[7rem] px-2 py-1.5 text-slate-800',
                      isSamplePreview && executive && 'text-white/75',
                    )}
                  >
                    {row.name}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap text-right tabular-nums',
                      executive ? 'px-4 py-2.5 text-white/80' : 'px-2 py-1.5 text-slate-700',
                      isSamplePreview && executive && 'text-white/65',
                    )}
                  >
                    {formatCurrencyZar(row.spend)}
                  </td>
                  <td
                    className={cn(
                      executive ? 'px-4 py-2.5 text-white/70' : 'px-2 py-1.5 text-slate-600',
                      isSamplePreview && executive && 'text-white/60',
                    )}
                  >
                    {row.level}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={cn(
          'mt-4 border shadow-sm transition',
          !executive && 'flex-1',
          executive ? 'rounded-2xl border-white/15 p-4 sm:p-5' : 'mt-4 rounded-xl p-3',
          canGoPreview && preview
            ? executive
              ? 'border-white/15 bg-white/5'
              : 'border-[#05363A]/20 bg-white'
            : executive
              ? 'border-dashed border-white/25 bg-white/5'
              : 'border-dashed border-slate-300/90 bg-white/70',
        )}
      >
        <p
          className={cn(
            'font-semibold uppercase tracking-wide',
            executive ? 'text-[11px] text-white/60' : 'text-[10px] text-slate-500',
          )}
        >
          Procurement score snapshot
        </p>
        {canGoPreview && preview ? (
          <>
            <p
              className={cn(
                'mt-3 font-bold tabular-nums',
                executive ? 'text-3xl text-white' : 'text-2xl text-slate-950',
              )}
            >
              {formatPoints(preview.totalScore)}
              <span
                className={cn(
                  'font-semibold',
                  executive ? 'text-lg text-white/45' : 'text-base text-slate-400',
                )}
              >
                {' '}
                / {formatPoints(PROCUREMENT_MAX_POINTS, 0)}
              </span>
            </p>
            <dl
              className={cn(
                'mt-4 grid grid-cols-1 gap-2.5',
                executive ? 'text-xs' : 'text-[11px]',
              )}
            >
              <div className="flex justify-between gap-2">
                <dt className={executive ? 'text-white/55' : 'text-slate-500'}>TMPS</dt>
                <dd
                  className={cn(
                    'font-semibold tabular-nums',
                    executive ? 'text-white' : 'text-slate-900',
                  )}
                >
                  {formatCurrencyZar(denominator)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className={executive ? 'text-white/55' : 'text-slate-500'}>B-BBEE vs TMPS</dt>
                <dd
                  className={cn(
                    'font-semibold tabular-nums',
                    executive ? 'text-white' : 'text-slate-900',
                  )}
                >
                  {formatPercentFromRatio(bbbeeShare, 1)}
                </dd>
              </div>
            </dl>
            <ul
              className={cn(
                'mt-4 space-y-2 border-t pt-4',
                executive ? 'border-white/10 text-xs' : 'border-slate-100 text-[10px]',
              )}
            >
              {topCategories.map((cat) => (
                <li key={cat.key} className="flex justify-between gap-3">
                  <span className={cn('truncate', executive ? 'text-white/65' : 'text-slate-600')}>
                    {cat.name}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-semibold tabular-nums',
                      executive ? 'text-white' : 'text-slate-900',
                    )}
                  >
                    {formatPoints(cat.pointsAchieved)}
                  </span>
                </li>
              ))}
            </ul>
            <p className={cn('mt-3', executive ? 'text-xs text-white/55' : 'text-[10px] text-slate-500')}>
              {tmpsNote}
            </p>
          </>
        ) : (
          <div className="mt-3 space-y-2">
            <p className={cn('text-sm font-medium', executive ? 'text-white/85' : 'text-slate-700')}>
              Complete the workflow to calculate points
            </p>
            <p className={cn('text-[11px] leading-relaxed', executive ? 'text-white/55' : 'text-slate-500')}>
              Upload → map columns → choose TMPS → generate preview.
            </p>
            <div className={cn('mt-3 space-y-1.5', executive ? 'opacity-80' : 'opacity-50')}>
              <div className={cn('h-2 rounded', executive ? 'bg-white/25' : 'bg-slate-200')} />
              <div className={cn('h-2 w-4/5 rounded', executive ? 'bg-white/25' : 'bg-slate-200')} />
              <div className={cn('h-2 w-3/5 rounded', executive ? 'bg-white/25' : 'bg-slate-200')} />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}


function WorkflowLockedPanel({
  darkSurface = false,
  title,
  description,
  checklist,
  actionLabel,
  onAction,
}: {
  darkSurface?: boolean
  title: string
  description: string
  checklist: { done: boolean; label: string }[]
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center sm:min-h-[280px]',
        darkSurface ? 'border-white/20 bg-white/5' : 'border-slate-200 bg-slate-50/80',
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          darkSurface ? 'bg-white/10 text-white/60' : 'bg-slate-200/80 text-slate-500',
        )}
      >
        <Lock className="h-5 w-5" aria-hidden />
      </div>
      <h3 className={cn('mt-4 text-lg font-semibold', darkSurface ? 'text-white' : 'text-slate-900')}>
        {title}
      </h3>
      <p
        className={cn(
          'mt-2 max-w-md text-sm leading-relaxed',
          darkSurface ? 'text-white/65' : 'text-slate-600',
        )}
      >
        {description}
      </p>
      <ul className="mt-6 w-full max-w-sm space-y-2 text-left text-sm">
        {checklist.map((item) => (
          <li key={item.label} className="flex items-start gap-2">
            <CheckCircle2
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                item.done ? 'text-emerald-400' : darkSurface ? 'text-white/25' : 'text-slate-300',
              )}
              aria-hidden
            />
            <span
              className={
                item.done ? (darkSurface ? 'text-white/85' : 'text-slate-700') : darkSurface ? 'text-white/45' : 'text-slate-500'
              }
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAction}
        className={
          darkSurface
            ? cn('mt-8', previewFooterPrimaryClass(false))
            : buttonStyles({ variant: 'primary', size: 'sm', className: 'mt-8' })
        }
      >
        {actionLabel}
      </button>
    </div>
  )
}

function UploadStepPanel({
  darkSurface = false,
  compact = false,
  fillHeight = false,
  workbookName,
  isReadingFile,
  parse,
  parseIssues,
  useDemoDataset,
  importBlocked,
  onFileChange,
  onUseSample,
}: {
  darkSurface?: boolean
  compact?: boolean
  fillHeight?: boolean
  workbookName: string | null
  isReadingFile: boolean
  parse: ProcurementExcelParseSuccess | null
  parseIssues: ProcurementExcelParseIssue[]
  useDemoDataset: boolean
  importBlocked: boolean
  onFileChange: (file: File | undefined) => void
  onUseSample: () => void
}) {
  return (
    <div
      className={cn(
        fillHeight ? 'flex min-h-0 flex-1 flex-col gap-5' : 'space-y-4',
        compact && !fillHeight && 'space-y-3',
      )}
    >
      <div>
        <p
          className={cn(
            'inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]',
            darkSurface ? 'text-white/50' : 'text-slate-500',
          )}
        >
          <FileSpreadsheet
            className={cn('h-3.5 w-3.5', darkSurface ? 'text-emerald-400/90' : 'text-[#0b5259]')}
            aria-hidden
          />
          Excel import
        </p>
        <h3
          className={cn(
            'mt-1 font-semibold tracking-tight',
            darkSurface ? 'text-white' : 'text-slate-950',
            compact ? 'text-base' : 'mt-1.5 text-lg',
          )}
        >
          Upload a procurement workbook
        </h3>
        {!compact ? (
          <p
            className={cn(
              'mt-1.5 max-w-2xl break-words text-sm leading-relaxed',
              darkSurface ? 'text-white/55' : 'text-slate-600',
            )}
          >
            Same flow as the app: we detect a supplier register tab and suggest column mappings.
          </p>
        ) : null}
      </div>

      <label
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-4 transition',
          darkSurface
            ? 'border-white/25 bg-white/5 hover:border-white/40 hover:bg-white/[0.08]'
            : 'border-slate-200 bg-white hover:border-[#0b5259]/40 hover:bg-slate-50/50',
          fillHeight ? 'min-h-[220px] flex-1 rounded-2xl py-12 sm:min-h-[260px]' : compact ? 'rounded-2xl py-6' : 'rounded-2xl py-10',
        )}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          disabled={isReadingFile}
          onChange={(e) => onFileChange(e.target.files?.[0])}
        />
        {isReadingFile ? (
          <Loader2
            className={cn(
              'animate-spin',
              fillHeight ? 'h-10 w-10' : 'h-8 w-8',
              darkSurface ? 'text-white/60' : 'text-[#0b5259]',
            )}
            aria-hidden
          />
        ) : (
          <Upload
            className={cn(
              fillHeight ? 'h-10 w-10' : 'h-8 w-8',
              darkSurface ? 'text-white/45' : 'text-slate-400',
            )}
            aria-hidden
          />
        )}
        <p className={cn('mt-3 text-sm font-semibold', darkSurface ? 'text-white' : 'text-slate-800')}>
          {isReadingFile ? 'Reading workbook…' : 'Drop a file here or click to browse'}
        </p>
        <p className={cn('mt-1 text-xs', darkSurface ? 'text-white/55' : 'text-slate-500')}>.xlsx or .xls</p>
      </label>

      <div className={cn(fillHeight && 'shrink-0')}>
        <button
          type="button"
          onClick={onUseSample}
          disabled={isReadingFile}
          className={
            darkSurface
              ? previewFooterSecondaryClass(isReadingFile)
              : buttonStyles({
                  variant: 'secondary',
                  size: 'sm',
                  className: cn(isReadingFile && 'opacity-40'),
                })
          }
        >
          Use sample workbook
        </button>
      </div>

      {workbookName ? (
        <div className={cn('space-y-2', fillHeight && 'shrink-0')}>
          <p
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm',
              darkSurface
                ? 'rounded-xl border border-white/15 bg-white/5 text-white'
                : 'rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-900',
            )}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {useDemoDataset ? 'Sample loaded:' : 'Workbook read:'}{' '}
            <span className="font-medium">{workbookName}</span>
          </p>
          {parse && !importBlocked ? (
            <p
              className={cn(
                'rounded-xl border px-3 py-2 text-xs',
                darkSurface
                  ? 'border-white/15 bg-white/5 text-white/75'
                  : 'border-slate-200 bg-slate-50 text-slate-700',
              )}
            >
              Sheet <span className="font-semibold">{parse.selectedSheetName}</span> ·{' '}
              {parse.totalRowCountInSheet} data row{parse.totalRowCountInSheet === 1 ? '' : 's'} · column
              mapping suggested
            </p>
          ) : null}
          {importBlocked ? (
            <p
              className={cn(
                'rounded-xl border px-3 py-2 text-xs',
                darkSurface
                  ? 'border-amber-400/35 bg-amber-400/10 text-amber-100'
                  : 'border-amber-200 bg-amber-50 text-amber-900',
              )}
            >
              No supplier register tab detected in this file. Try a procurement workbook with supplier name and
              spend columns, or use the sample workbook.
            </p>
          ) : null}
          {parseIssues.length > 0 ? (
            <ul
              className={cn(
                'space-y-1 rounded-xl border px-3 py-2 text-xs',
                darkSurface
                  ? 'border-white/15 bg-white/5 text-white/70'
                  : 'border-slate-200 bg-white text-slate-600',
              )}
            >
              {parseIssues.slice(0, 4).map((issue, i) => (
                <li key={`${issue.message}-${i}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function MapStepPanel({
  darkSurface = false,
  fillHeight = false,
  workbookName,
  displayWorkbookName,
  sheetName,
  columnHeaders,
  mapping,
  onMappingChange,
  onApply,
  mappingApplied,
  rowsInFile,
  useDemoSuggestions,
  importBlocked,
}: {
  darkSurface?: boolean
  fillHeight?: boolean
  workbookName: string | null
  displayWorkbookName: string | null
  sheetName: string | null
  columnHeaders: string[]
  mapping: ProcurementExcelColumnMapping
  onMappingChange: (m: ProcurementExcelColumnMapping) => void
  onApply: () => void
  mappingApplied: boolean
  rowsInFile: number
  useDemoSuggestions: boolean
  importBlocked: boolean
}) {
  if (!workbookName) {
    return (
      <p className={cn('text-sm', darkSurface ? 'text-white/65' : 'text-slate-600')}>
        Upload a workbook first, then map columns to supplier fields.
      </p>
    )
  }

  const formFields = ['supplier_name', 'spend_amount', 'bbb_level'] as const
  const fileLabel = displayWorkbookName ?? workbookName
  const optionalFields = ['black_ownership', 'black_women_ownership', 'bdgs_51'] as const

  const suggestedMappings = useDemoSuggestions
    ? MARKETING_MAP_PREVIEW.suggestions.map((row) => ({
        source: row.source,
        targetLabel: PROCUREMENT_EXCEL_FIELD_META[row.field].label,
        required: PROCUREMENT_EXCEL_FIELD_META[row.field].required,
      }))
    : (
        Object.entries(mapping) as [keyof ProcurementExcelColumnMapping, string | null | undefined][]
      )
        .filter(([, column]) => column)
        .map(([field, column]) => {
          const meta = PROCUREMENT_EXCEL_FIELD_META[field as keyof typeof PROCUREMENT_EXCEL_FIELD_META]
          return {
            source: column as string,
            targetLabel: meta?.label ?? String(field),
            required: meta?.required ?? false,
          }
        })

  const detectedCount = useDemoSuggestions
    ? MARKETING_MAP_PREVIEW.suggestions.length
    : columnHeaders.length
  const requiredMapped = formFields.filter((f) => mapping[f]).length
  const optionalMapped = optionalFields.filter((f) => mapping[f]).length

  return (
    <div className={cn(fillHeight ? 'flex min-h-0 flex-1 flex-col gap-5' : 'space-y-5')}>
      <div className="shrink-0">
        <p
          className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.16em]',
            darkSurface ? 'text-white/50' : 'text-slate-500',
          )}
        >
          Column mapping
        </p>
        <h3 className={cn('mt-1 text-lg font-semibold tracking-tight', darkSurface ? 'text-white' : 'text-slate-950')}>
          Map columns
        </h3>
        <p className={cn('mt-1.5 text-sm', darkSurface ? 'text-white/60' : 'text-slate-600')}>
          Sheet: <span className={cn('font-medium', darkSurface && 'text-white/85')}>{sheetName ?? '—'}</span>
          {' · '}
          <span className={cn('font-medium', darkSurface && 'text-white/85')}>{fileLabel}</span>
          {rowsInFile > 0 ? (
            <span className={darkSurface ? 'text-white/45' : 'text-slate-500'}>
              {' '}
              · {rowsInFile.toLocaleString()} rows in file
            </span>
          ) : null}
        </p>
      </div>

      <div className={cn(mapPanelClass(darkSurface), 'shrink-0 p-4 sm:p-5')}>
        <p
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wide',
            darkSurface ? 'text-white/50' : 'text-slate-500',
          )}
        >
          Required field mappings
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formFields.map((field) => (
            <div key={field} className="space-y-1.5">
              <label
                className={cn('text-xs font-medium', darkSurface ? 'text-white/80' : 'text-slate-700')}
              >
                {PROCUREMENT_EXCEL_FIELD_META[field].label}
                {PROCUREMENT_EXCEL_FIELD_META[field].required ? (
                  <span className="text-red-400/90"> *</span>
                ) : null}
              </label>
              <select
                value={mapping[field] ?? ''}
                onChange={(e) =>
                  onMappingChange({ ...mapping, [field]: e.target.value || null })
                }
                className={darkSurface ? mapSelectClassDark : tmpsInputClass}
              >
                {columnHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,260px)]',
          fillHeight && 'min-h-0 flex-1',
        )}
      >
        <div className={cn(mapPanelClass(darkSurface), 'flex min-h-0 flex-col p-4 sm:p-5')}>
          <p
            className={cn(
              'shrink-0 text-[11px] font-semibold uppercase tracking-wide',
              darkSurface ? 'text-white/50' : 'text-slate-500',
            )}
          >
            Suggested mappings
          </p>
          <p className={cn('mt-1 shrink-0 text-xs', darkSurface ? 'text-white/45' : 'text-slate-500')}>
            Detected columns matched to procurement fields
          </p>
          <ul
            className={cn(
              'mt-3 min-h-0 flex-1 divide-y',
              darkSurface ? 'divide-white/10' : 'divide-slate-200/80',
            )}
          >
            {suggestedMappings.map((row) => (
              <li
                key={`${row.source}-${row.targetLabel}`}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2.5 text-xs sm:text-sm"
              >
                <span
                  className={cn('truncate font-medium', darkSurface ? 'text-white/85' : 'text-slate-800')}
                >
                  {row.source}
                </span>
                <span className={cn('shrink-0', darkSurface ? 'text-white/35' : 'text-slate-400')}>→</span>
                <span
                  className={cn('truncate text-right', darkSurface ? 'text-white/65' : 'text-slate-600')}
                >
                  {row.targetLabel}
                  {row.required ? (
                    <span className={cn('ml-1', darkSurface ? 'text-white/40' : 'text-slate-400')}>*</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(mapPanelClass(darkSurface), 'flex flex-col p-4 sm:p-5')}>
          <p
            className={cn(
              'text-[11px] font-semibold uppercase tracking-wide',
              darkSurface ? 'text-white/50' : 'text-slate-500',
            )}
          >
            Ready to apply
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              { label: 'Columns detected', value: String(detectedCount) },
              { label: 'Required fields mapped', value: `${requiredMapped} of 3` },
              {
                label: 'Supplier rows ready',
                value: rowsInFile > 0 ? rowsInFile.toLocaleString() : '—',
              },
              {
                label: 'Optional ownership fields',
                value:
                  optionalMapped > 0 || useDemoSuggestions
                    ? 'Available in workbook'
                    : 'Not mapped yet',
              },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-baseline justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0',
                  darkSurface ? 'border-white/10' : 'border-slate-200/80',
                )}
              >
                <dt className={darkSurface ? 'text-white/50' : 'text-slate-500'}>{item.label}</dt>
                <dd
                  className={cn(
                    'shrink-0 font-semibold tabular-nums',
                    darkSurface ? 'text-white' : 'text-slate-900',
                  )}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <p
            className={cn(
              'mt-4 border-t pt-4 text-xs',
              darkSurface ? 'border-white/10 text-white/45' : 'border-slate-200 text-slate-500',
              mappingApplied && (darkSurface ? '!text-white/70' : 'text-emerald-800'),
            )}
          >
            {mappingApplied ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Mappings applied — continue to TMPS when ready
              </span>
            ) : (
              'Review mappings, then apply before continuing.'
            )}
          </p>
        </div>
      </div>

      <div className={cn('shrink-0', fillHeight && 'flex flex-wrap items-center gap-3')}>
        <button
          type="button"
          onClick={onApply}
          className={
            darkSurface
              ? previewFooterPrimaryClass(false)
              : buttonStyles({ variant: 'primary', size: 'sm' })
          }
        >
          Apply mappings to assessment
        </button>
        {importBlocked ? (
          <p className={cn('text-sm', darkSurface ? 'text-amber-200/90' : 'text-amber-800')}>
            Cannot map suppliers — upload a workbook with a supplier register tab.
          </p>
        ) : null}
      </div>
    </div>
  )
}


function TmpsStepPanel({
  darkSurface = false,
  assessmentYear,
  onAssessmentYearChange,
  tmpsSource,
  onTmpsSourceChange,
  denominator,
  tmpsNote,
  scorePreviewReady,
}: {
  darkSurface?: boolean
  assessmentYear: number
  onAssessmentYearChange: (y: number) => void
  tmpsSource: ProcurementTmpsDenominatorSource
  onTmpsSourceChange: (s: ProcurementTmpsDenominatorSource) => void
  denominator: number
  tmpsNote: string
  scorePreviewReady: boolean
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <StepBadge step="Step 1" darkSurface={darkSurface} />
        <label
          htmlFor="preview-assessment-year"
          className={cn('block text-sm font-medium', darkSurface ? 'text-white/75' : 'text-slate-700')}
        >
          Assessment year
        </label>
        <input
          id="preview-assessment-year"
          type="number"
          min={2000}
          max={2100}
          value={assessmentYear}
          onChange={(e) => onAssessmentYearChange(Number(e.target.value) || 2026)}
          className={cn(
            darkSurface ? tmpsInputClassDark : tmpsInputClass,
            'max-w-xs rounded-2xl px-4 py-3',
          )}
        />
      </section>

      <section
        className={cn(
          'space-y-6 rounded-[28px] border p-5 shadow-sm',
          darkSurface
            ? 'border-white/15 bg-white/5'
            : 'border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white',
        )}
      >
        <div>
          <StepBadge step="Step 2" darkSurface={darkSurface} />
          <p
            className={cn(
              'mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]',
              darkSurface ? 'text-white/50' : 'text-slate-500',
            )}
          >
            TMPS (measured procurement)
          </p>
          <h3
            className={cn(
              'mt-1 text-lg font-semibold tracking-tight',
              darkSurface ? 'text-white' : 'text-slate-950',
            )}
          >
            What number divides your supplier spend?
          </h3>
        </div>

        <div
          className={cn(
            'rounded-2xl border p-5 shadow-sm',
            darkSurface
              ? 'border-white/15 bg-white/5'
              : 'border-slate-200 bg-gradient-to-b from-white to-slate-50/40',
          )}
        >
          <h4 className={cn('text-sm font-semibold', darkSurface ? 'text-white' : 'text-slate-900')}>
            1 · Pick what counts as TMPS
          </h4>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <button
              type="button"
              aria-pressed={tmpsSource === 'calculated'}
              onClick={() => onTmpsSourceChange('calculated')}
              className={tmpsOptionButtonClass(darkSurface, tmpsSource === 'calculated')}
            >
              <p className={tmpsOptionTitleClass(darkSurface, tmpsSource === 'calculated')}>
                Calculated TMPS
              </p>
              <p className={tmpsOptionSubtitleClass(darkSurface, tmpsSource === 'calculated')}>
                Use the pad below
              </p>
            </button>
            <button
              type="button"
              aria-pressed={tmpsSource === 'import_supplier_total'}
              onClick={() => onTmpsSourceChange('import_supplier_total')}
              className={tmpsOptionButtonClass(darkSurface, tmpsSource === 'import_supplier_total')}
            >
              <p
                className={tmpsOptionTitleClass(darkSurface, tmpsSource === 'import_supplier_total')}
              >
                Use supplier spend as TMPS
              </p>
              <p
                className={tmpsOptionSubtitleClass(
                  darkSurface,
                  tmpsSource === 'import_supplier_total',
                )}
              >
                Sum of supplier B-BBEE Spend lines
              </p>
            </button>
          </div>

          <div
            className={cn(
              'mt-4 rounded-xl border px-4 py-3 text-xs',
              darkSurface
                ? 'border-white/18 bg-white/[0.08] text-white/75'
                : 'border-slate-200/80 bg-slate-50/70 text-slate-700',
            )}
          >
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wide',
                darkSurface ? 'text-white/55' : 'text-slate-500',
              )}
            >
              Live scoring denominator (TMPS)
            </p>
            <p
              className={cn(
                'mt-1 text-lg font-bold tabular-nums tracking-tight',
                darkSurface ? 'text-white' : 'text-slate-950',
              )}
            >
              {formatCurrency(denominator)}
            </p>
            <p
              className={cn(
                'mt-0.5 text-sm font-medium',
                darkSurface ? 'text-white/85' : 'text-slate-800',
              )}
            >
              {tmpsNote}
            </p>
            <p
              className={cn(
                'mt-2 text-[11px] leading-relaxed',
                darkSurface ? 'text-white/60' : 'text-slate-600',
              )}
            >
              {tmpsDenominatorSourceShortNote(tmpsSource)}
            </p>
          </div>

          <p
            className={cn(
              'mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed',
              darkSurface
                ? 'border-white/15 bg-white/[0.06] text-white/80'
                : 'border-[#05363A]/20 bg-[#05363A]/5 text-[#05363A]',
            )}
          >
            {scorePreviewReady
              ? 'TMPS confirmed. Open Preview scorecard to see points, or change TMPS above and click Next again to refresh.'
              : 'Choose your TMPS option above, then click Next to calculate the procurement score preview from the sample workbook.'}
          </p>
        </div>
      </section>
    </div>
  )
}

function PreviewStepPanel({
  darkSurface = false,
  preview,
  tmpsNote,
  denominator,
  bbbeeShare,
  recognisedSpend,
  fromUploadedWorkbook,
}: {
  darkSurface?: boolean
  preview: ProcurementAssessmentResult
  tmpsNote: string
  denominator: number
  bbbeeShare: number
  recognisedSpend: number
  fromUploadedWorkbook: boolean
}) {
  return (
    <section className="space-y-6">
      <div
        className={cn(
          'flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between',
          darkSurface ? 'border-white/15' : 'border-slate-200',
        )}
      >
        <div>
          <div
            className={cn(
              'mb-3 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em]',
              darkSurface
                ? 'border-white/20 bg-white/10 text-white/60'
                : 'border-slate-200 bg-slate-50 text-slate-500',
            )}
          >
            Live Preview
          </div>
          <h2 className={cn('text-2xl font-bold tracking-tight', darkSurface ? 'text-white' : 'text-slate-950')}>
            Procurement Score Preview
          </h2>
          <p className={cn('mt-2 text-sm', darkSurface ? 'text-white/65' : 'text-slate-600')}>
            {fromUploadedWorkbook
              ? 'Calculated from your uploaded supplier lines and TMPS choice.'
              : 'Sample workbook preview — upload your file to score your own data.'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 sm:text-right">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total points</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-slate-950">
            {formatPoints(preview.totalScore)}
            <span className="text-xl font-bold text-slate-400">
              {' '}
              / {formatPoints(PROCUREMENT_MAX_POINTS, 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard variant="navy" label="Scoring denominator" value={formatCurrencyZar(denominator)} note={tmpsNote} />
        <MetricCard
          label="Recognised B-BBEE spend"
          value={formatCurrencyZar(recognisedSpend)}
          note="Recognition applied to each line's B-BBEE Spend, summed"
        />
        <MetricCard
          label="B-BBEE spend vs TMPS"
          value={formatPercentFromRatio(bbbeeShare, 1)}
          note="Recognised B-BBEE spend ÷ scoring denominator"
        />
        <MetricCard
          label="Est. procurement points"
          value={formatPoints(preview.totalScore)}
          note="Recalculates from your TMPS choice"
        />
      </div>

      <div className={cn(darkSurface && 'overflow-hidden rounded-2xl bg-white p-1 sm:p-2')}>
        <ProcurementScorecardTable result={preview} tmpsDenominatorNote={tmpsNote} />
      </div>
    </section>
  )
}

function ExportStepPanel({ darkSurface = false }: { darkSurface?: boolean }) {
  return (
    <section className="space-y-6">
      <div
        className={cn(
          'rounded-2xl border p-6',
          darkSurface ? 'border-white/15 bg-white/5' : 'border-slate-200 bg-slate-50/80',
        )}
      >
        <h3 className={cn('text-lg font-semibold', darkSurface ? 'text-white' : 'text-slate-900')}>
          Save assessment &amp; export report
        </h3>
        <p
          className={cn(
            'mt-2 text-sm leading-relaxed',
            darkSurface ? 'text-white/65' : 'text-slate-600',
          )}
        >
          In the live app you save the assessment to a company, compare runs over time, and open the
          executive PDF report — the same Preferential Procurement table and metrics you previewed.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            Save procurement assessment to your company record
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            Open assessment report with scorecard breakdown
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            Export client-ready PDF for stakeholders
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={LOGIN_NEW_ASSESSMENT} className={buttonStyles({ variant: 'primary', size: 'md' })}>
          Sign in to create an assessment
        </Link>
        <Link
          href="/contact"
          className={buttonStyles({ variant: 'secondary', size: 'md' })}
        >
          Book a consultation
        </Link>
      </div>

      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm">
        <FileText className="h-4 w-4 text-[#0b5259]" aria-hidden />
        PDF report export (after sign-in)
      </div>
    </section>
  )
}

function StepBadge({ step, darkSurface = false }: { step: string; darkSurface?: boolean }) {
  return (
    <p
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        darkSurface
          ? 'border-white/20 bg-white/10 text-white/70'
          : 'border-[#0b163d]/20 bg-[#0b163d]/10 text-[#0b163d]',
      )}
    >
      {step}
    </p>
  )
}

function MetricCard({
  label,
  value,
  note,
  variant = 'default',
}: {
  label: string
  value: string
  note: string
  variant?: 'default' | 'navy'
}) {
  if (variant === 'navy') {
    return (
      <div className="rounded-xl border border-[#0b163d]/20 bg-gradient-to-br from-[#0b163d] to-[#0f255f] px-4 py-3 text-white shadow-[0_10px_26px_rgba(11,22,61,0.22)]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
        <p className="mt-1 text-[11px] leading-snug text-white/65">{note}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{note}</p>
    </div>
  )
}
