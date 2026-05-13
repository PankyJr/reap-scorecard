import * as XLSX from 'xlsx'
import { FULL_SCORECARD_EXPECTED_SHEETS } from './constants'
import {
  buildSheetRowsIndexFromBuffer,
  detectScorecardWorkbookKind,
  resolveExpectedSheet,
} from './detectWorkbook'
import { parseEmploymentEquitySheet } from './parsers/employmentEquity'
import { parseFullScorecardSummarySheet } from './parsers/fullScorecard'
import {
  parseBoardMembersSheet,
  parseExecutiveCommitteeSheet,
  parseManagementControlSheet,
  parseStaffListSheet,
} from './parsers/managementControl'
import { parseNpatSheet } from './parsers/npat'
import { parseOwnershipSheet } from './parsers/ownership'
import { parseProcurementForFullScorecard } from './parsers/procurement'
import { parseEdSdSheet } from './parsers/edSd'
import { parseSedSheet } from './parsers/sed'
import {
  parseEmp201Sheet,
  parseLearnerPathSheet,
  parseSkillsDevelopmentSheet,
} from './parsers/skillsDevelopment'
import { parseTmpsSheet } from './parsers/tmps'
import type {
  FullScorecardParseFailure,
  FullScorecardParseResult,
  FullScorecardParseSuccess,
  FullScorecardPreview,
  ScorecardSheetPresenceRow,
  ScorecardSummaryBlock,
} from './types'

function mergeBullets(blocks: ScorecardSummaryBlock[], labels: string[]): ScorecardSummaryBlock {
  const bullets: string[] = []
  let rank = 0
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const label = labels[i] ?? 'Section'
    for (const line of b.bullets) {
      bullets.push(`${label}: ${line}`)
    }
    if (b.status === 'row_data_detected') rank = 2
    else if (b.status === 'summary_detected' && rank < 2) rank = 1
  }
  const status: ScorecardSummaryBlock['status'] =
    rank >= 2 ? 'row_data_detected' : rank === 1 ? 'summary_detected' : 'partial'
  return { status, bullets }
}

function instructionsBlock(): ScorecardSummaryBlock {
  return {
    status: 'summary_detected',
    bullets: ['Instructions tab is informational only (not scored in this preview).'],
  }
}

function coverageFromBlock(
  sheetPresent: boolean,
  block: ScorecardSummaryBlock,
): ScorecardSheetPresenceRow['coverage'] {
  if (!sheetPresent) return 'missing'
  if (block.status === 'row_data_detected') return 'complete'
  if (block.status === 'summary_detected') return 'summary'
  return 'partial'
}

function detailFromBlock(block: ScorecardSummaryBlock): string {
  return block.bullets[0] ?? '—'
}

function emptyBlock(): ScorecardSummaryBlock {
  return { status: 'empty_or_unclear', bullets: [] }
}

function buildPreview(args: {
  sheetNames: string[]
  sheetRows: Map<string, unknown[][]>
  buffer: Buffer
  filename: string
}): FullScorecardPreview {
  const { sheetNames, sheetRows, buffer, filename } = args

  const get = (id: string) => {
    const def = FULL_SCORECARD_EXPECTED_SHEETS.find((s) => s.id === id)
    if (!def) return { name: null as string | null, rows: null as unknown[][] | null }
    const name = resolveExpectedSheet(sheetNames, def)
    if (!name) return { name: null, rows: null }
    return { name, rows: sheetRows.get(name) ?? null }
  }

  const o = get('ownership')
  const ownershipBlock = o.rows ? parseOwnershipSheet(o.rows) : { status: 'missing_sheet' as const, bullets: [] }

  const mc = get('management_control')
  const board = get('board_members')
  const exec = get('executive_committee')
  const staff = get('staff_list')

  const mcBlock = mc.rows ? parseManagementControlSheet(mc.rows) : emptyBlock()
  const boardBlock = board.rows ? parseBoardMembersSheet(board.rows) : emptyBlock()
  const execBlock = exec.rows ? parseExecutiveCommitteeSheet(exec.rows) : emptyBlock()
  const staffBlock = staff.rows ? parseStaffListSheet(staff.rows) : emptyBlock()

  const managementControl = mergeBullets(
    [mcBlock, boardBlock, execBlock, staffBlock],
    ['Management Control', 'Board members', 'Executive committee', 'Staff list'],
  )

  const ee = get('employment_equity')
  const employmentEquityBlock = ee.rows
    ? parseEmploymentEquitySheet(ee.rows)
    : { status: 'missing_sheet' as const, bullets: [] }

  const sd = get('skills_development')
  const skillsDevelopmentBlock = sd.rows
    ? parseSkillsDevelopmentSheet(sd.rows)
    : { status: 'missing_sheet' as const, bullets: [] }

  const tmpsG = get('tmps')
  const tmps = parseTmpsSheet(tmpsG.rows ?? [], tmpsG.name)

  const proc = get('procurement')
  const procurement = proc.name
    ? parseProcurementForFullScorecard({
        buffer,
        filename,
        procurementSheetName: proc.name,
      })
    : {
        sheetName: null,
        supplierRowCount: 0,
        totalSpendZar: null,
        totalSpendDisplay: null,
        message: 'No Procurement tab matched the expected template names.',
        sampleSuppliers: [] as { name: string; spendDisplay: string }[],
      }

  const ed = get('ed_sd')
  const edSdBlock = ed.rows ? parseEdSdSheet(ed.rows) : { status: 'missing_sheet' as const, bullets: [] }

  const sedG = get('sed')
  const sedBlock = sedG.rows ? parseSedSheet(sedG.rows) : { status: 'missing_sheet' as const, bullets: [] }

  const fs = get('full_scorecard')
  const fullScorecardBlock = fs.rows
    ? parseFullScorecardSummarySheet(fs.rows)
    : { status: 'missing_sheet' as const, bullets: [] }

  const np = get('npat')
  const npatBlock = np.rows ? parseNpatSheet(np.rows) : { status: 'missing_sheet' as const, bullets: [] }

  const emp = get('emp201')
  const emp201Block = emp.rows ? parseEmp201Sheet(emp.rows) : null

  const inst = get('instructions')
  const catA = get('cat_a')
  const interns = get('interns_learners')
  const catG = get('cat_g')
  const learnerSummary = get('learner_summary')

  const otherParts: ScorecardSummaryBlock[] = []
  const otherLabels: string[] = []
  if (emp201Block) {
    otherParts.push(emp201Block)
    otherLabels.push('13 EMP201')
  }
  const learnerBlocks: ScorecardSummaryBlock[] = []
  const learnerLabels: string[] = []
  if (inst.rows) {
    learnerBlocks.push(instructionsBlock())
    learnerLabels.push('Instructions')
  }
  if (catA.rows) {
    learnerBlocks.push(parseLearnerPathSheet(catA.rows, 'Cat A'))
    learnerLabels.push('Cat A')
  }
  if (interns.rows) {
    learnerBlocks.push(parseLearnerPathSheet(interns.rows, 'Interns & Learners'))
    learnerLabels.push('Interns & Learners')
  }
  if (catG.rows) {
    learnerBlocks.push(parseLearnerPathSheet(catG.rows, 'Cat G'))
    learnerLabels.push('Cat G')
  }
  if (learnerSummary.rows) {
    learnerBlocks.push(parseLearnerPathSheet(learnerSummary.rows, 'Learner summary'))
    learnerLabels.push('Learner summary')
  }
  if (learnerBlocks.length > 0) {
    otherParts.push(mergeBullets(learnerBlocks, learnerLabels))
    otherLabels.push('Instructions & learner paths')
  }
  const otherRegisters =
    otherParts.length > 0
      ? mergeBullets(otherParts, otherLabels)
      : {
          status: 'empty_or_unclear' as const,
          bullets: ['No EMP201 / Instructions / Cat A / learner tabs were matched.'],
        }

  const blockForSheetId = (id: string): ScorecardSummaryBlock => {
    switch (id) {
      case 'ownership':
        return o.rows ? ownershipBlock : { status: 'missing_sheet', bullets: [] }
      case 'management_control':
        return mc.rows ? mcBlock : { status: 'missing_sheet', bullets: [] }
      case 'board_members':
        return board.rows ? boardBlock : { status: 'missing_sheet', bullets: [] }
      case 'executive_committee':
        return exec.rows ? execBlock : { status: 'missing_sheet', bullets: [] }
      case 'staff_list':
        return staff.rows ? staffBlock : { status: 'missing_sheet', bullets: [] }
      case 'employment_equity':
        return ee.rows ? employmentEquityBlock : { status: 'missing_sheet', bullets: [] }
      case 'skills_development':
        return sd.rows ? skillsDevelopmentBlock : { status: 'missing_sheet', bullets: [] }
      case 'tmps':
        return tmpsG.rows
          ? { status: 'summary_detected', bullets: tmps.bullets }
          : { status: 'missing_sheet', bullets: [] }
      case 'procurement':
        return proc.rows
          ? {
              status: procurement.supplierRowCount > 0 ? 'row_data_detected' : 'summary_detected',
              bullets: [
                procurement.supplierRowCount > 0
                  ? `${procurement.supplierRowCount} supplier row(s) with mapped spend.`
                  : 'Procurement tab present; no supplier rows passed validation.',
              ],
            }
          : { status: 'missing_sheet', bullets: [] }
      case 'ed_sd':
        return ed.rows ? edSdBlock : { status: 'missing_sheet', bullets: [] }
      case 'sed':
        return sedG.rows ? sedBlock : { status: 'missing_sheet', bullets: [] }
      case 'full_scorecard':
        return fs.rows ? fullScorecardBlock : { status: 'missing_sheet', bullets: [] }
      case 'npat':
        return np.rows ? npatBlock : { status: 'missing_sheet', bullets: [] }
      case 'cat_a':
        return catA.rows
          ? parseLearnerPathSheet(catA.rows, 'Cat A')
          : { status: 'missing_sheet', bullets: [] }
      case 'interns_learners':
        return interns.rows
          ? parseLearnerPathSheet(interns.rows, 'Interns & Learners')
          : { status: 'missing_sheet', bullets: [] }
      case 'cat_g':
        return catG.rows
          ? parseLearnerPathSheet(catG.rows, 'Cat G')
          : { status: 'missing_sheet', bullets: [] }
      case 'learner_summary':
        return learnerSummary.rows
          ? parseLearnerPathSheet(learnerSummary.rows, 'Learner summary')
          : { status: 'missing_sheet', bullets: [] }
      case 'emp201':
        return emp.rows ? emp201Block ?? emptyBlock() : { status: 'missing_sheet', bullets: [] }
      case 'instructions':
        return inst.rows ? instructionsBlock() : { status: 'missing_sheet', bullets: [] }
      default:
        return emptyBlock()
    }
  }

  const sheets: ScorecardSheetPresenceRow[] = FULL_SCORECARD_EXPECTED_SHEETS.map((def) => {
    const actual = resolveExpectedSheet(sheetNames, def)
    const rows = actual ? sheetRows.get(actual) ?? null : null
    const block = blockForSheetId(def.id)
    const cov = coverageFromBlock(Boolean(rows && actual), block)
    return {
      expectedLabel: def.title,
      actualSheetName: actual,
      coverage: cov,
      detail: actual && rows ? detailFromBlock(block) : 'Tab not found under expected names.',
    }
  })

  const missingOrUnclearSections: string[] = []
  for (const row of sheets) {
    if (row.coverage === 'missing') missingOrUnclearSections.push(`Missing: ${row.expectedLabel}`)
    else if (row.coverage === 'partial') missingOrUnclearSections.push(`Unclear / partial: ${row.expectedLabel}`)
  }

  return {
    sheets,
    ownership: o.rows ? ownershipBlock : { status: 'missing_sheet', bullets: ['Ownership tab not found.'] },
    managementControl,
    employmentEquity: ee.rows
      ? employmentEquityBlock
      : { status: 'missing_sheet', bullets: ['Employment Equity tab not found.'] },
    skillsDevelopment: sd.rows
      ? skillsDevelopmentBlock
      : { status: 'missing_sheet', bullets: ['Skills Development tab not found.'] },
    tmps,
    procurement,
    edSd: ed.rows ? edSdBlock : { status: 'missing_sheet', bullets: ['ED & SD tab not found.'] },
    sed: sedG.rows ? sedBlock : { status: 'missing_sheet', bullets: ['SED tab not found.'] },
    fullScorecard: fs.rows
      ? fullScorecardBlock
      : { status: 'missing_sheet', bullets: ['Full Scorecard tab not found.'] },
    npat: np.rows ? npatBlock : { status: 'missing_sheet', bullets: ['NPAT tab not found.'] },
    otherRegisters,
    missingOrUnclearSections,
  }
}

export function parseFullScorecardWorkbook(args: {
  buffer: Buffer
  filename: string
}): FullScorecardParseResult {
  const workbookName = args.filename || 'workbook'
  let sheetNames: string[] = []
  try {
    const wb = XLSX.read(args.buffer, {
      type: 'buffer',
      cellFormula: false,
      cellText: true,
      raw: true,
      dense: false,
    })
    sheetNames = wb.SheetNames.filter(Boolean)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown read error'
    const fail: FullScorecardParseFailure = {
      ok: false,
      workbookName,
      issues: [
        {
          level: 'error',
          message: `Could not read this Excel file (${msg}). Try saving as .xlsx or .xls and upload again.`,
        },
      ],
    }
    return fail
  }

  if (sheetNames.length === 0) {
    return {
      ok: false,
      workbookName,
      issues: [{ level: 'error', message: 'The workbook has no sheets.' }],
    }
  }

  const sheetRows = buildSheetRowsIndexFromBuffer(args.buffer)
  const kind = detectScorecardWorkbookKind({
    sheetNames,
    getRows: (n) => sheetRows.get(n) ?? [],
  })

  const issues: FullScorecardParseSuccess['issues'] = []

  if (kind === 'supplier_register_only') {
    const ok: FullScorecardParseSuccess = {
      ok: true,
      workbookName,
      workbookKind: kind,
      issues,
      guidance:
        'This workbook looks like a procurement supplier register, not a full generic scorecard file. Use **New Procurement Assessment** and the supplier Excel upload there for column mapping and applying suppliers.',
    }
    return ok
  }

  if (kind === 'unrelated') {
    const ok: FullScorecardParseSuccess = {
      ok: true,
      workbookName,
      workbookKind: kind,
      issues,
      guidance:
        'We could not recognise this file as a full scorecard template (expected tabs such as TMPS, Procurement, Full Scorecard) or as a supplier register. Check tab names or upload the Generic Scorecard workbook.',
    }
    return ok
  }

  const preview = buildPreview({
    sheetNames,
    sheetRows,
    buffer: args.buffer,
    filename: workbookName,
  })

  issues.push({
    level: 'info',
    message:
      'This is an import preview only. It does not change stored assessments or replace the dedicated procurement supplier upload.',
  })

  const ok: FullScorecardParseSuccess = {
    ok: true,
    workbookName,
    workbookKind: 'full_scorecard',
    issues,
    preview,
  }
  return ok
}
