/**
 * Deterministic Skills Development extraction from workbook tabs (full-scorecard path only).
 *
 * ## Sheet roles (typical B-BBEE generic templates — verify against live files)
 *
 * **`Skills Development`**
 * - Column A: row labels; B–D: actual %, target %, available points (same layout as Ownership / Management Control).
 * - Expenditure sub-scores: rows whose labels match Black people / Black women / Disabled Black people demographics
 *   under the skills expenditure section → `skills_development.expenditure.*`
 * - Optional pillar total available points row → `skills_development.total.available_points`
 * - Optional **total training spend** (currency) row: label contains `total` and (`training` | `spend` | `expenditure`)
 *   but not learner-summary wording → `skills_development.total_training_spend`
 *
 * **`Interns & Learners`**
 * - Same B–D column pattern for learnership / apprenticeship / internship compliance rows →
 *   `skills_development.learnerships.*`
 *
 * **`Learner summary`**
 * - Absorption-of-learners bonus: row label contains `absorption` and (`bonus` | `learner` | `learnership`) →
 *   `skills_development.bonus.absorption.*` from columns B–D.
 * - Optional sheet bonus pool → `skills_development.total.bonus_available_points` when a single unambiguous
 *   “bonus” + “available” + (“point” | “total”) row exists.
 *
 * **`13 EMP201`**
 * - Leviable amount / payroll base: column A label matches `leviable` or (`payroll` and `base`), value in column B →
 *   `skills_development.leviable_amount`
 *
 * ## Sheets not used in v1 (layout varies too much across templates)
 *
 * **`Cat A`**, **`Category A`**, **`Cat G`**: Category spend / learner grids differ by issuer; no deterministic
 *   row contract without a locked template. Extraction does not read these tabs; if your workbook only exposes
 *   SD metrics there, related engine indicators stay `not_calculated` with workbook warnings.
 *
 * ## Demographics
 * - `disabled_black_people`: label indicates disability/disabled **and** Black people/person (not Black women —
 *   no metric keys exist for disabled Black women; such rows are skipped).
 * - Ambiguous duplicate demographic rows → warning metrics + validation issues; those triples are excluded from scoring.
 */
import * as XLSX from 'xlsx'
import type {
  CanonicalExtractionResult,
  ExtractedMetricValue,
  FullWorkbookSheetData,
  FullWorkbookValidationIssue,
  MetricDefinition,
  ParsedWorkbookResult,
} from '../types'
import { SKILLS_DEVELOPMENT_SHEET_METRIC_DEFINITIONS } from '../metric-definitions'
import { createMetricValue, detectExcelError, findWorkbookSheetByTitle } from './helpers'

const COL_LABEL = 0
const COL_TARGET = 1
const COL_AVAILABLE = 2
const COL_PERCENTAGE = 3
const COL_POINTS_ACHIEVED = 4
const COL_VALUE_B = 1

function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function cellAddress(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c })
}

function defByKey(): Map<string, MetricDefinition> {
  return new Map(SKILLS_DEVELOPMENT_SHEET_METRIC_DEFINITIONS.map((d) => [d.metricKey, d]))
}

function emit(
  defs: Map<string, MetricDefinition>,
  metricKey: string,
  args: {
    value: unknown
    sourceSheet: string
    sourceCell: string | null
    sourceRange?: string | null
    validationState?: 'valid' | 'warning' | 'error'
    validationMessage?: string | null
  },
): ExtractedMetricValue {
  const def = defs.get(metricKey)
  if (!def) throw new Error(`Missing Skills Development metric definition: ${metricKey}`)
  return createMetricValue(def, args)
}

function pushAmbiguousPrefix(
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
  defs: Map<string, MetricDefinition>,
  sheetName: string,
  metricPrefix: string,
  message: string,
) {
  const suffixes = ['percentage', 'target', 'available_points'] as const
  for (const suf of suffixes) {
    const metricKey = `${metricPrefix}.${suf}`
    if (!defs.has(metricKey)) continue
    metrics.push(
      emit(defs, metricKey, {
        value: null,
        sourceSheet: sheetName,
        sourceCell: null,
        validationState: 'warning',
        validationMessage: message,
      }),
    )
  }
  issues.push({
    issueType: 'metric_value_warning',
    severity: 'warning',
    sheetName,
    metricKey: metricPrefix,
    message,
  })
}

function extractRowAt(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metricPrefix: string,
  row: number,
  metrics: ExtractedMetricValue[],
): void {
  const sheetName = sheet.sheetName
  const rawPct = sheet.rows[row]?.[COL_PERCENTAGE]
  const rawTgt = sheet.rows[row]?.[COL_TARGET]
  const rawAvail = sheet.rows[row]?.[COL_AVAILABLE]
  const rawPoints = sheet.rows[row]?.[COL_POINTS_ACHIEVED]

  const toNum = (v: unknown): number | null => {
    if (v == null || v === '') return null
    const n = Number(String(v).replace(/[,%\s]/g, ''))
    return Number.isFinite(n) ? n : null
  }

  const pushCell = (suffix: string, col: number, raw: unknown) => {
    const metricKey = `${metricPrefix}.${suffix}`
    if (detectExcelError(raw)) {
      metrics.push(
        emit(defs, metricKey, {
          value: null,
          sourceSheet: sheetName,
          sourceCell: cellAddress(row, col),
          validationState: 'warning',
          validationMessage: `Excel error in ${metricKey}.`,
        }),
      )
      return
    }
    metrics.push(
      emit(defs, metricKey, {
        value: raw,
        sourceSheet: sheetName,
        sourceCell: cellAddress(row, col),
      }),
    )
  }

  const targetNum = toNum(rawTgt)
  const availNum = toNum(rawAvail)
  const pointsNum = toNum(rawPoints)
  if ((rawPct == null || rawPct === '') && targetNum != null && availNum != null && availNum > 0 && pointsNum != null) {
    metrics.push(
      emit(defs, `${metricPrefix}.percentage`, {
        value: (pointsNum / availNum) * targetNum,
        sourceSheet: sheetName,
        sourceCell: cellAddress(row, COL_POINTS_ACHIEVED),
        validationState: 'valid',
        validationMessage: `Derived achieved percentage from points achieved at ${cellAddress(row, COL_POINTS_ACHIEVED)}.`,
      }),
    )
  } else {
    pushCell('percentage', COL_PERCENTAGE, rawPct)
  }
  pushCell('target', COL_TARGET, rawTgt)
  pushCell('available_points', COL_AVAILABLE, rawAvail)
}

function classifySkillsDemographic(label: string): 'black_people' | 'black_women' | 'disabled_black_people' | null {
  if (!label.includes('black')) return null
  const isWomen = label.includes('woman') || label.includes('women')
  const isDisabled = label.includes('disabilit') || label.includes('disabled')
  if (isDisabled && isWomen) return null
  if (isDisabled && (label.includes('people') || label.includes('person'))) return 'disabled_black_people'
  if (isWomen) return 'black_women'
  if (label.includes('people') || label.includes('person')) return 'black_people'
  return null
}

function extractTripleDemographicOnSheet(args: {
  sheet: FullWorkbookSheetData
  defs: Map<string, MetricDefinition>
  metricStem: string
  metrics: ExtractedMetricValue[]
  issues: FullWorkbookValidationIssue[]
  startRow?: number
  endRow?: number
}): void {
  const { sheet, defs, metricStem, metrics, issues } = args
  const start = args.startRow ?? 0
  const end = args.endRow ?? sheet.rows.length
  const plans: { kind: 'black_people' | 'black_women' | 'disabled_black_people'; row: number }[] = []
  const ambiguous = new Set<string>()
  const seen = new Map<string, number>()
  const hasNumericTargetAndAvailable = (r: number): boolean => {
    const t = sheet.rows[r]?.[COL_TARGET]
    const a = sheet.rows[r]?.[COL_AVAILABLE]
    const num = (v: unknown) => {
      if (v == null || v === '') return null
      const n = Number(String(v).replace(/[,%\s]/g, ''))
      return Number.isFinite(n) ? n : null
    }
    return num(t) != null && num(a) != null
  }

  for (let r = start; r < end; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!label) continue
    const kind = classifySkillsDemographic(label)
    if (!kind) continue
    if (!hasNumericTargetAndAvailable(r)) continue
    if (seen.has(kind)) {
      ambiguous.add(kind)
      continue
    }
    seen.set(kind, r)
    plans.push({ kind, row: r })
  }

  for (const k of ambiguous) {
    pushAmbiguousPrefix(
      metrics,
      issues,
      defs,
      sheet.sheetName,
      `${metricStem}.${k}`,
      `Ambiguous Skills Development sheet "${sheet.sheetName}": multiple rows matched ${k.replace(/_/g, ' ')}.`,
    )
  }

  for (const p of plans) {
    if (ambiguous.has(p.kind)) continue
    extractRowAt(sheet, defs, `${metricStem}.${p.kind}`, p.row, metrics)
  }
}

function extractSkillsDevelopmentSheetTotals(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const isSdTotalAvailable = (label: string, row: unknown[]) =>
    label.includes('total') &&
    ((label.includes('available') && (label.includes('point') || label.includes('skills') || label.includes('development'))) ||
      (() => {
        const raw = String(row[COL_AVAILABLE] ?? '').replace(/[,%\s]/g, '')
        if (!raw) return false
        const n = Number(raw)
        return Number.isFinite(n)
      })())

  let totalAvailRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!isSdTotalAvailable(label, sheet.rows[r] ?? [])) continue
    if (totalAvailRow >= 0) {
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        metricKey: 'skills_development.total.available_points',
        message: 'Multiple total-available rows on Skills Development sheet; pillar total available points skipped.',
      })
      totalAvailRow = -2
      break
    }
    totalAvailRow = r
  }
  if (totalAvailRow >= 0) {
    const raw = sheet.rows[totalAvailRow]?.[COL_AVAILABLE]
    metrics.push(
      emit(defs, 'skills_development.total.available_points', {
        value: raw,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(totalAvailRow, COL_AVAILABLE),
      }),
    )
  }

  const isTotalTrainingSpend = (label: string) => {
    if (!label.includes('total')) return false
    if (label.includes('learner') || label.includes('learnership') || label.includes('absorption')) return false
    return (
      label.includes('training') ||
      label.includes('spend') ||
      label.includes('expenditure') ||
      label.includes('expense')
    )
  }

  let spendRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!isTotalTrainingSpend(label)) continue
    if (spendRow >= 0) {
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        metricKey: 'skills_development.total_training_spend',
        message: 'Multiple candidate total training spend rows; metric skipped.',
      })
      spendRow = -2
      break
    }
    spendRow = r
  }
  if (spendRow >= 0) {
    const raw = sheet.rows[spendRow]?.[COL_PERCENTAGE]
    metrics.push(
      emit(defs, 'skills_development.total_training_spend', {
        value: raw,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(spendRow, COL_PERCENTAGE),
      }),
    )
  }
}

function extractExpenditureByOrderedRows(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
): boolean {
  let headerRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const l = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (l.includes('skills development expenditure')) {
      headerRow = r
      break
    }
  }
  if (headerRow < 0) {
    for (let r = 0; r < sheet.rows.length; r += 1) {
      const l = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
      if (l.includes('training expenditure') && l.includes('black')) {
        headerRow = r - 1
        break
      }
    }
  }
  if (headerRow < 0) return false
  const candidates: number[] = []
  for (let r = headerRow + 1; r < Math.min(sheet.rows.length, headerRow + 8); r += 1) {
    const l = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!l || l.includes('bonus') || l.includes('total')) continue
    const t = Number(String(sheet.rows[r]?.[COL_TARGET] ?? '').replace(/[,%\s]/g, ''))
    const a = Number(String(sheet.rows[r]?.[COL_AVAILABLE] ?? '').replace(/[,%\s]/g, ''))
    if (!Number.isFinite(t) || !Number.isFinite(a)) continue
    candidates.push(r)
  }
  if (candidates.length < 2) return false
  const ordered: Array<[string, number]> = [
    ['skills_development.expenditure.black_people', candidates[0]],
    ['skills_development.expenditure.black_women', candidates[1]],
  ]
  if (candidates[2] != null) ordered.push(['skills_development.expenditure.disabled_black_people', candidates[2]])
  for (const [stem, row] of ordered) {
    extractRowAt(sheet, defs, stem, row, metrics)
  }
  return true
}

function extractAbsorptionBonus(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const candidates: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!label.includes('absorption')) continue
    if (!(label.includes('bonus') || label.includes('learner') || label.includes('learnership'))) continue
    candidates.push(r)
  }
  if (candidates.length === 0) return
  if (candidates.length > 1) {
    pushAmbiguousPrefix(
      metrics,
      issues,
      defs,
      sheet.sheetName,
      'skills_development.bonus.absorption',
      `Ambiguous Learner summary: ${candidates.length} rows matched absorption bonus pattern.`,
    )
    return
  }
  extractRowAt(sheet, defs, 'skills_development.bonus.absorption', candidates[0], metrics)
}

function extractBonusAvailablePoints(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const hits: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!label.includes('bonus')) continue
    if (!label.includes('available')) continue
    if (!(label.includes('point') || label.includes('total'))) continue
    hits.push(r)
  }
  if (hits.length === 0) return
  if (hits.length > 1) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: sheet.sheetName,
      metricKey: 'skills_development.total.bonus_available_points',
      message: 'Multiple bonus available-points rows on Learner summary; metric skipped.',
    })
    return
  }
  const r = hits[0]
  const raw = sheet.rows[r]?.[COL_AVAILABLE]
  if (detectExcelError(raw)) {
    metrics.push(
      emit(defs, 'skills_development.total.bonus_available_points', {
        value: null,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(r, COL_AVAILABLE),
        validationState: 'warning',
        validationMessage: 'Excel error in skills_development.total.bonus_available_points.',
      }),
    )
    return
  }
  metrics.push(
    emit(defs, 'skills_development.total.bonus_available_points', {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(r, COL_AVAILABLE),
    }),
  )
}

function extractLeviableFromEmp201(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const matches: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!label) continue
    const leviable = label.includes('leviable')
    const payrollBase = label.includes('payroll') && label.includes('base')
    if (!leviable && !payrollBase) continue
    matches.push(r)
  }
  if (matches.length === 0) return
  if (matches.length > 1) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: sheet.sheetName,
      metricKey: 'skills_development.leviable_amount',
      message: 'Multiple leviable / payroll-base rows on EMP201; leviable_amount skipped.',
    })
    return
  }
  const r = matches[0]
  const raw = sheet.rows[r]?.[COL_VALUE_B]
  if (detectExcelError(raw)) {
    metrics.push(
      emit(defs, 'skills_development.leviable_amount', {
        value: null,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(r, COL_VALUE_B),
        validationState: 'warning',
        validationMessage: 'Excel error in skills_development.leviable_amount.',
      }),
    )
    return
  }
  metrics.push(
    emit(defs, 'skills_development.leviable_amount', {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(r, COL_VALUE_B),
    }),
  )
}

export function extractSkillsDevelopmentSheetMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const metrics: ExtractedMetricValue[] = []
  const issues: FullWorkbookValidationIssue[] = []
  const defs = defByKey()

  const sd = findWorkbookSheetByTitle(parsedWorkbook, 'Skills Development')
  if (sd) {
    const topScoringEnd =
      (() => {
        for (let r = 0; r < sd.rows.length; r += 1) {
          const l = normalizeLabel(sd.rows[r]?.[COL_LABEL])
          if (l.includes('black people expenditure')) return r
        }
        return sd.rows.length
      })()
    const usedOrdered = extractExpenditureByOrderedRows(sd, defs, metrics)
    if (!usedOrdered) {
      extractTripleDemographicOnSheet({
        sheet: sd,
        defs,
        metricStem: 'skills_development.expenditure',
        metrics,
        issues,
        endRow: topScoringEnd,
      })
    }
    extractSkillsDevelopmentSheetTotals(sd, defs, metrics, issues)
  } else {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: 'Skills Development',
      message: 'Sheet "Skills Development" not found; expenditure and sheet-level SD metrics were not extracted.',
    })
  }

  const interns = findWorkbookSheetByTitle(parsedWorkbook, 'Interns & Learners')
  if (interns) {
    extractTripleDemographicOnSheet({
      sheet: interns,
      defs,
      metricStem: 'skills_development.learnerships',
      metrics,
      issues,
      endRow: 30,
    })
  } else {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: 'Interns & Learners',
      message: 'Sheet "Interns & Learners" not found; learnership proportional metrics were not extracted.',
    })
  }

  const learnerSummary = findWorkbookSheetByTitle(parsedWorkbook, 'Learner summary')
  if (learnerSummary) {
    extractAbsorptionBonus(learnerSummary, defs, metrics, issues)
    extractBonusAvailablePoints(learnerSummary, defs, metrics, issues)
  } else {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: 'Learner summary',
      message: 'Sheet "Learner summary" not found; absorption bonus metrics were not extracted.',
    })
  }

  const emp201 = findWorkbookSheetByTitle(parsedWorkbook, '13 EMP201')
  if (emp201) {
    extractLeviableFromEmp201(emp201, defs, metrics, issues)
  } else {
    issues.push({
      issueType: 'parse_warning',
      severity: 'warning',
      message: 'Optional sheet "13 EMP201" not found; leviable_amount not extracted.',
    })
  }

  return { metrics, issues }
}
