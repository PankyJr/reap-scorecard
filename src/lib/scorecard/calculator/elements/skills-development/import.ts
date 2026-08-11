/**
 * Skills Development import from the 'Skills Development ' sheet (trailing space).
 *
 * ## What is read, and why not the obvious cells
 *
 * The sheet computes its results through a formula chain from four feeder tabs
 * (Category A, Category BCDE, Category F&G, Category BCD(Hcount)). Its headline
 * cells H44 / H73 / H102 are NOT spend figures — they are the workbook's own
 * EAP five-step POINT totals:
 *
 *   H44 = SUM(B43:G45),  B43 = MIN(B26/B35*B39, B39)
 *                        B26 = spend_band / leviable   (share)
 *                        B35 = adjustedEAP * 0.035      (split target)
 *                        B39 = adjustedEAP * 6          (max band points)
 *
 * Rows 5/7/12 then back-derive a nominal "achieved %" from those points
 * (D5 = E5/C5*B5). Importing them would mean importing the workbook's scoring,
 * which the engine deliberately recomputes — and in an unpopulated template
 * they are cached #DIV/0! errors anyway.
 *
 * So this importer stops one level lower, at the INPUT rows, which are the
 * numerators and denominators the engine's own five-step needs.
 *
 * ## Row provenance
 *
 * Like the ED/SD importer, this reads the workbook directly with
 * `sheet_to_json` (no `blankrows: false`), so array indices already line up
 * with worksheet rows once offset by the sheet's `!ref` origin. The
 * `trueRowIndex` reconstruction used by the Ownership extractor is only needed
 * when reading the blank-collapsed grid from `parseWorkbookFromBuffer`.
 *
 * ## Deliberate gaps
 *
 * - `learnersAbsorbed` does not exist in the workbook. Its absorption measure
 *   is completed / headcount, which the rule set rejects in favour of
 *   absorbed / completed, so the 5 bonus points stay a manual input.
 * - The four eligibility gates (WSP/ATR, Pivotal report, priority skills
 *   programme, trainee register) are nowhere on the sheet and stay manual.
 */
import * as XLSX from 'xlsx'
import type { EapHeadcounts } from '@/lib/scorecard/generic/scoring'

const IMPORT_VERSION = 'skills-development-import-v1'
const SHEET_ALIASES = ['skills development']

/** Column order fixed by the sheet's own header rows 22 / 51 / 80. */
const BAND_ORDER = [
  'african_male',
  'coloured_male',
  'indian_male',
  'african_female',
  'coloured_female',
  'indian_female',
] as const

export type SkillsImportPreview = {
  sheetName: string
  leviableAmount: number | null
  totalEmployees: number | null
  generalTrainingSpendByBand: EapHeadcounts | null
  bursarySpendByBand: EapHeadcounts | null
  learnerHeadcountByBand: EapHeadcounts | null
  disabilityTrainingSpend: number | null
  learnersCompleted: number | null
  /** Always null: the workbook has no absorbed-learner figure. */
  learnersAbsorbed: null
  /** Field name -> worksheet cell or range it came from. */
  provenance: Record<string, string>
  notes: string[]
  errors: string[]
}

type Section = 'general' | 'bursary' | 'learnerships' | 'disability' | 'absorption' | null

function normalize(value: unknown): string {
  return String(value ?? '')
    .replace(/ /g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findSheet(workbook: XLSX.WorkBook): string | null {
  return (
    workbook.SheetNames.find((name) => SHEET_ALIASES.includes(normalize(name))) ?? null
  )
}

const EXCEL_ERROR = /^#(REF|DIV\/0|VALUE|NAME|NULL|NUM|N\/A)[!?]?$/i

/** null = absent; 'error' = cached Excel error; otherwise a finite number. */
function readNumber(raw: unknown): number | null | 'error' {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 'error'
  const text = String(raw).trim()
  if (EXCEL_ERROR.test(text)) return 'error'
  const parsed = Number(text.replace(/[R\s,]/gi, ''))
  return Number.isFinite(parsed) ? parsed : 'error'
}

function sectionFor(label: string): Section {
  if (/black people expenditure/.test(label)) return 'general'
  if (/bursar/.test(label)) return 'bursary'
  if (/^learnerships?$/.test(label)) return 'learnerships'
  if (/disabilt|disabilit/.test(label)) return 'disability'
  if (/absorption/.test(label)) return 'absorption'
  return null
}

export function importSkillsDevelopmentWorkbook(args: {
  workbookBuffer: ArrayBuffer | Buffer
}): SkillsImportPreview {
  const notes: string[] = [`Importer version: ${IMPORT_VERSION}.`]
  const errors: string[] = []
  const provenance: Record<string, string> = {}

  const base: SkillsImportPreview = {
    sheetName: '',
    leviableAmount: null,
    totalEmployees: null,
    generalTrainingSpendByBand: null,
    bursarySpendByBand: null,
    learnerHeadcountByBand: null,
    disabilityTrainingSpend: null,
    learnersCompleted: null,
    learnersAbsorbed: null,
    provenance,
    notes,
    errors,
  }

  const workbook = XLSX.read(args.workbookBuffer, { type: 'buffer', cellDates: true })
  const sheetName = findSheet(workbook)
  if (!sheetName) {
    errors.push('No "Skills Development" sheet was found in the workbook.')
    return base
  }
  base.sheetName = sheetName

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true })
  const originRow = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r : 0
  const rowNumber = (index: number) => index + originRow + 1

  /**
   * Read the six band cells (columns B..G) from a row. Returns null and records
   * a named error when any is a cached Excel error, so a broken formula never
   * degrades into a zero-filled map.
   */
  const readBands = (index: number, field: string, label: string): EapHeadcounts | null => {
    const row = rows[index] ?? []
    const out: Record<string, number> = {}
    for (let i = 0; i < BAND_ORDER.length; i += 1) {
      const value = readNumber(row[i + 1])
      if (value === 'error') {
        errors.push(
          `${label} contains a cached Excel error at ${XLSX.utils.encode_col(i + 1)}${rowNumber(index)}. ` +
            'Recalculate the workbook in Excel and save it before importing.',
        )
        return null
      }
      out[BAND_ORDER[i]] = value ?? 0
    }
    provenance[field] = `B${rowNumber(index)}:G${rowNumber(index)}`
    return out as EapHeadcounts
  }

  const readAnchor = (index: number, col: number, field: string, label: string): number | null => {
    const value = readNumber((rows[index] ?? [])[col])
    const cell = `${XLSX.utils.encode_col(col)}${rowNumber(index)}`
    if (value === 'error') {
      errors.push(
        `${label} at ${cell} is a cached Excel error. Recalculate the workbook in Excel and save it before importing.`,
      )
      return null
    }
    if (value == null || value === 0) {
      errors.push(
        `${label} at ${cell} is ${value == null ? 'empty' : 'zero'}. Skills Development cannot be scored without it — ` +
          'capture it, or recalculate and save the workbook from Excel.',
      )
      return null
    }
    provenance[field] = cell
    return value
  }

  // --- walk the sheet, tracking which input block we are inside -------------
  let section: Section = null
  let sawGeneral = false
  const seen = { general: false, bursary: false, learnerships: false }

  for (let r = 0; r < rows.length; r += 1) {
    const label = normalize((rows[r] ?? [])[0])
    if (!label) continue

    const next = sectionFor(label)
    if (next) {
      // The scoring block at the top repeats "Learnerships"; only start
      // tracking once the input blocks begin at "Black People Expenditure".
      if (next === 'general') sawGeneral = true
      if (sawGeneral) section = next
      continue
    }
    if (!sawGeneral) continue

    if (label.startsWith('total employees per race')) {
      if (section === 'general') {
        base.generalTrainingSpendByBand = readBands(r, 'generalTrainingSpend', 'General training spend')
        base.leviableAmount = readAnchor(r, 7, 'leviableAmount', 'Leviable amount')
        seen.general = true
      } else if (section === 'bursary') {
        base.bursarySpendByBand = readBands(r, 'bursarySpend', 'Bursary spend')
        seen.bursary = true
      } else if (section === 'learnerships') {
        base.learnerHeadcountByBand = readBands(r, 'learnerHeadcount', 'Learner headcount')
        base.totalEmployees = readAnchor(r, 7, 'totalEmployees', 'Total staff')
        seen.learnerships = true
      }
      continue
    }

    if (section === 'disability' && label.startsWith('recognised spend')) {
      const value = readNumber((rows[r] ?? [])[1])
      if (value === 'error') {
        errors.push(
          `Disabled-learner spend at B${rowNumber(r)} is a cached Excel error. Recalculate the workbook in Excel and save it.`,
        )
      } else if (value != null) {
        base.disabilityTrainingSpend = value
        provenance.disabilityTrainingSpend = `B${rowNumber(r)}`
      }
      continue
    }

    if (section === 'absorption' && label.startsWith('completed learners')) {
      const value = readNumber((rows[r] ?? [])[1])
      if (value !== 'error' && value != null) {
        base.learnersCompleted = value
        provenance.learnersCompleted = `B${rowNumber(r)}`
      }
      continue
    }
  }

  // --- named misses ---------------------------------------------------------
  if (!sawGeneral) {
    errors.push(
      `The "Black People Expenditure" input block was not found on "${sheetName}"; no skills inputs could be read.`,
    )
  }
  if (sawGeneral && !seen.general) errors.push('The general training spend row was not found.')
  if (sawGeneral && !seen.bursary) errors.push('The bursary spend row was not found.')
  if (sawGeneral && !seen.learnerships) {
    errors.push('The learnership headcount row was not found; learnerships cannot be scored.')
  }
  if (base.disabilityTrainingSpend == null) {
    notes.push('No disabled-learner spend was found; that indicator will not score.')
  }

  notes.push(
    'Learners absorbed is not present in this workbook — its absorption measure is completed / headcount, ' +
      'while the Codes measure absorbed / completed. Capture absorbed learners manually before the 5 bonus points can score.',
  )
  notes.push(
    'The four eligibility gates (SETA-approved Workplace Skills Plan and Annual Training Report, Pivotal report, ' +
      'priority skills programme, trainee tracking register) are not in the workbook and must be confirmed manually.',
  )
  notes.push('Workbook point cells H44 / H73 / H102 are ignored; the engine rescores from these inputs.')

  return base
}
