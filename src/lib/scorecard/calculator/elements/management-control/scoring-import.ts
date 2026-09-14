/**
 * Management Control SCORING inputs (distinct from the register import next
 * door, which produces a privacy-stripped review snapshot and no aggregates).
 *
 * The 19 points are split across two sheets:
 *
 *   'Management Control'   F/G block  -> board, executive directors, other
 *                                        executive management (9 points)
 *   'Employment Equity'    six EAP blocks + a disability block (10 points)
 *
 * ## The mislabelled row
 *
 * The template repeats "Black Executive Management" at F16 and F19 — only
 * D16 = G19/G20 reveals that F19 is the FEMALE row. Label matching alone would
 * read the same figure twice, so the F/G block is walked in order and each
 * "Total …" row closes the pair opened by the preceding count row.
 *
 * ## Totals
 *
 * The workbook carries a separate total for the black row and the female row of
 * each group (G5 vs G8). The engine takes one total per group, so the black
 * row's total wins and a mismatch is reported with both figures named — the
 * same checksum treatment the ED/SD importer gives its sheet totals.
 *
 * ## Row provenance
 *
 * Read directly with `sheet_to_json` (no `blankrows: false`), so indices line
 * up with worksheet rows once offset by the sheet's `!ref` origin.
 */
import * as XLSX from 'xlsx'
import type { EapDistribution, EapHeadcounts } from '@/lib/scorecard/generic/scoring'
import type {
  DirectRepresentationCounts,
  OccupationalBandCounts,
} from '@/lib/scorecard/generic/elements/management-control'

const IMPORT_VERSION = 'management-control-scoring-import-v1'

const BAND_ORDER = [
  'african_male',
  'coloured_male',
  'indian_male',
  'african_female',
  'coloured_female',
  'indian_female',
] as const

export type ManagementControlScoringPreview = {
  board: DirectRepresentationCounts
  executiveDirectors: DirectRepresentationCounts
  otherExecutiveManagement: DirectRepresentationCounts
  seniorManagement: OccupationalBandCounts
  middleManagement: OccupationalBandCounts
  juniorManagement: OccupationalBandCounts
  blackEmployeesWithDisabilities: number | null
  totalEmployees: number | null
  /** The EAP row the workbook itself asserts — offered, never imposed. */
  workbookEapDistribution: EapDistribution | null
  workbookEapSource: string | null
  provenance: Record<string, string>
  notes: string[]
  errors: string[]
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .replace(/ /g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function num(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const parsed = Number(String(raw).replace(/[R\s,]/gi, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function findSheet(wb: XLSX.WorkBook, target: string): string | null {
  return wb.SheetNames.find((n) => normalize(n) === target) ?? null
}

function gridOf(wb: XLSX.WorkBook, name: string) {
  const sheet = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true })
  const origin = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r : 0
  return { rows, rowNumber: (i: number) => i + origin + 1 }
}

const EMPTY_DIRECT = (): DirectRepresentationCounts => ({ total: null, black: null, blackWomen: null })
const EMPTY_BAND = (): OccupationalBandCounts => ({ total: null, byDemographic: {} })

export function importManagementControlScoringWorkbook(args: {
  workbookBuffer: ArrayBuffer | Buffer
}): ManagementControlScoringPreview {
  const notes: string[] = [`Importer version: ${IMPORT_VERSION}.`]
  const errors: string[] = []
  const provenance: Record<string, string> = {}

  const out: ManagementControlScoringPreview = {
    board: EMPTY_DIRECT(),
    executiveDirectors: EMPTY_DIRECT(),
    otherExecutiveManagement: EMPTY_DIRECT(),
    seniorManagement: EMPTY_BAND(),
    middleManagement: EMPTY_BAND(),
    juniorManagement: EMPTY_BAND(),
    blackEmployeesWithDisabilities: null,
    totalEmployees: null,
    workbookEapDistribution: null,
    workbookEapSource: null,
    provenance,
    notes,
    errors,
  }

  const wb = XLSX.read(args.workbookBuffer, { type: 'buffer', cellDates: true })

  // --- 'Management Control' F/G block ---------------------------------------
  const mcName = findSheet(wb, 'management control')
  if (!mcName) {
    errors.push('No "Management Control" sheet was found; board and executive counts could not be read.')
  } else {
    const { rows, rowNumber } = gridOf(wb, mcName)

    /**
     * Walk column F in order. A count row opens a pending pair; the next
     * "Total …" row closes it. Order, not label, decides which group and
     * whether it is the black or the black-female row — F16 and F19 share a
     * label in the template.
     */
    type Pending = { group: 'board' | 'exec' | 'other'; label: string; value: number | null; row: number }
    let pending: Pending | null = null
    const pairs: Array<{ group: Pending['group']; value: number | null; total: number | null; row: number }> = []

    for (let r = 0; r < rows.length; r += 1) {
      const label = normalize((rows[r] ?? [])[5])
      if (!label) continue
      const value = num((rows[r] ?? [])[6])

      if (label.startsWith('total ')) {
        if (pending) {
          pairs.push({ group: pending.group, value: pending.value, total: value, row: pending.row })
          pending = null
        }
        continue
      }
      const group: Pending['group'] | null = /board/.test(label)
        ? 'board'
        : /executive directors?/.test(label)
          ? 'exec'
          : /executive management/.test(label)
            ? 'other'
            : null
      if (!group) continue
      pending = { group, label, value, row: r }
    }

    const assign = (group: Pending['group'], target: DirectRepresentationCounts, name: string) => {
      const found = pairs.filter((p) => p.group === group)
      if (found.length === 0) {
        errors.push(`The ${name} rows were not found in the Management Control F/G block.`)
        return
      }
      // First pair is the black row, second the black-female row.
      target.black = found[0].value
      target.total = found[0].total
      provenance[group === 'board' ? 'board' : group === 'exec' ? 'executiveDirectors' : 'otherExecutiveManagement'] =
        `G${rowNumber(found[0].row)}/G${rowNumber(found[0].row) + 1}`
      if (found.length < 2) {
        errors.push(`The black female ${name} row was not found; that indicator cannot be scored.`)
        return
      }
      target.blackWomen = found[1].value
      if (found[1].total != null && found[0].total != null && found[1].total !== found[0].total) {
        notes.push(
          `${name}: the black row states a total of ${found[0].total} while the female row states ${found[1].total}. ` +
            'The black row total is used; confirm the workbook.',
        )
      }
    }

    assign('board', out.board, 'board member')
    assign('exec', out.executiveDirectors, 'executive director')
    assign('other', out.otherExecutiveManagement, 'other executive management')
  }

  // --- 'Employment Equity' band and disability blocks ------------------------
  const eeName = findSheet(wb, 'employment equity')
  if (!eeName) {
    errors.push(
      'No "Employment Equity" sheet was found; senior, middle and junior management and disabilities could not be read.',
    )
    return out
  }

  const { rows, rowNumber } = gridOf(wb, eeName)
  let section: 'senior' | 'middle' | 'junior' | 'disability' | null = null
  let sectionIsWomen = false
  const seen = { senior: false, middle: false, junior: false }

  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r] ?? []
    const label = normalize(row[0])
    if (!label) continue

    if (/^black (people|women) at /.test(label)) {
      sectionIsWomen = label.startsWith('black women')
      section = /senior/.test(label)
        ? 'senior'
        : /middle/.test(label)
          ? 'middle'
          : /junior/.test(label)
            ? 'junior'
            : null
      continue
    }
    if (/black disabled employees/.test(label)) {
      section = 'disability'
      continue
    }

    if (label.startsWith('total employees per race') && section && section !== 'disability') {
      // Only the "Black People" block carries all six bands; the "Black Women"
      // block repeats the female three and is not read separately — the engine
      // derives the female indicator from the same map with femaleOnly.
      if (sectionIsWomen) continue
      const byDemographic: Record<string, number> = {}
      for (let i = 0; i < BAND_ORDER.length; i += 1) {
        byDemographic[BAND_ORDER[i]] = num(row[i + 1]) ?? 0
      }
      const total = num(row[7])
      const band = out[`${section}Management` as 'seniorManagement'] as OccupationalBandCounts
      band.byDemographic = byDemographic as EapHeadcounts
      band.total = total
      provenance[`${section}Management`] = `B${rowNumber(r)}:G${rowNumber(r)}`
      seen[section] = true
      continue
    }

    if (label === 'eap targets' && out.workbookEapDistribution == null) {
      const dist: Record<string, number> = {}
      let complete = true
      for (let i = 0; i < BAND_ORDER.length; i += 1) {
        const v = num(row[i + 1])
        if (v == null) { complete = false; break }
        dist[BAND_ORDER[i]] = v
      }
      if (complete) {
        out.workbookEapDistribution = dist as EapDistribution
        out.workbookEapSource = `${eeName}!B${rowNumber(r)}:G${rowNumber(r)}`
      }
      continue
    }

    if (section === 'disability') {
      if (label.startsWith('black')) {
        out.blackEmployeesWithDisabilities = num(row[1])
        provenance.blackEmployeesWithDisabilities = `B${rowNumber(r)}`
      } else if (label.startsWith('total')) {
        out.totalEmployees = num(row[1])
        provenance.totalEmployees = `B${rowNumber(r)}`
      }
    }
  }

  for (const key of ['senior', 'middle', 'junior'] as const) {
    if (!seen[key]) {
      errors.push(
        `The "Black People at ${key[0].toUpperCase()}${key.slice(1)} Management" block was not found on "${eeName}"; ` +
          `${key} management cannot be scored.`,
      )
    }
  }
  if (out.blackEmployeesWithDisabilities == null) {
    errors.push('The Black Disabled Employees block was not found; the disability indicator cannot be scored.')
  }

  notes.push(
    'Senior, middle and junior management need an EAP target set. The workbook asserts its own EAP row; ' +
      'it is offered for review and can be overridden in Settings.',
  )

  return out
}
