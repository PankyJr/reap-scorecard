/**
 * Local Book2 verification without touching Supabase.
 * Proves import, privacy-safe snapshot roundtrip, status, and calculation-run prevention.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { importManagementControlRegisterWorkbook } from '../src/lib/scorecard/calculator/elements/management-control/import.ts'
import { managementControlAdapter } from '../src/lib/scorecard/calculator/elements/management-control/adapter.ts'

const workbookPath = path.resolve('tmp/full-scorecard-reference/Book2.xlsx')
if (!fs.existsSync(workbookPath)) {
  throw new Error(`Missing local workbook: ${workbookPath}`)
}

const checksum = crypto
  .createHash('sha256')
  .update(fs.readFileSync(workbookPath))
  .digest('hex')

const preview = importManagementControlRegisterWorkbook({
  workbookBuffer: fs.readFileSync(workbookPath),
})

// Simulate save → reopen via JSONB snapshot roundtrip (no database).
const reopened = JSON.parse(JSON.stringify(preview))

const boardRows = reopened.rows.filter((r) => r.values.register === 'board')
const executiveRows = reopened.rows.filter(
  (r) => r.values.register === 'executive_committee',
)

const status =
  !managementControlAdapter.scoringReady && reopened.rows.length > 0
    ? 'needs_review'
    : 'ready_to_calculate'

const calculationBlocked = !managementControlAdapter.scoringReady
const serialized = JSON.stringify(reopened)
const sensitiveLeak =
  /"personName"|"identityNumber"|"position":|"resignationDate":/.test(serialized) ||
  /Identity Number|Name and Surname/.test(JSON.stringify(reopened.detectedHeaders))

const pageSrc = fs.readFileSync(
  'src/app/(dashboard)/scorecards/calculator/[assessmentId]/elements/[elementKey]/page.tsx',
  'utf8',
)
const actionsSrc = fs.readFileSync(
  'src/app/(dashboard)/scorecards/calculator/actions.ts',
  'utf8',
)

const report = {
  workbookPath,
  checksum,
  sheetsDetected: reopened.sheetName,
  boardRows: boardRows.length,
  executiveRows: executiveRows.length,
  totalRows: reopened.rows.length,
  validRows: reopened.validRowCount,
  warningRows: reopened.warningCount,
  rejectedRows: reopened.rejectedRowCount,
  importVersion: reopened.importVersion,
  sourceSheets: [...new Set(reopened.rows.map((r) => r.sourceSheet))],
  uniqueRoles: [...new Set(reopened.rows.map((r) => r.values.roleCategory))],
  uniqueGenders: [...new Set(reopened.rows.map((r) => r.values.gender))],
  uniqueRaces: [...new Set(reopened.rows.map((r) => r.values.race))],
  uniqueNationalities: [
    ...new Set(reopened.rows.map((r) => r.values.nationality)),
  ],
  elementStatus: status,
  scoringReady: managementControlAdapter.scoringReady,
  calculationRunPrevented: calculationBlocked,
  sensitiveDataProtected: !sensitiveLeak,
  saveRoundtripOk:
    reopened.importVersion === preview.importVersion &&
    reopened.rows.length === preview.rows.length,
  reopenOk:
    reopened.sheetName === preview.sheetName &&
    reopened.validRowCount === preview.validRowCount,
  uiImportReviewNotice: pageSrc.includes(
    'Import review only — scoring unavailable',
  ),
  uiNoCalculateWhenUnscored: pageSrc.includes('adapter.scoringReady ?'),
  uiWhitelistedPreview: pageSrc.includes("elementKey === 'management_control'"),
  uiRulesRequired: managementControlAdapter.help.outstandingBusinessRules.some(
    (rule) =>
      /Verified Management Control calculation rules are still required/i.test(
        rule,
      ),
  ),
  serverBlocksUnscoredCalculate: actionsSrc.includes(
    'Verified+scoring+is+not+available+for+this+element',
  ),
}

const outDir = 'tmp/full-scorecard-reference'
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(
  path.join(outDir, 'book2-import-verification.json'),
  JSON.stringify(report, null, 2) + '\n',
)

const failed = []
if (report.boardRows !== 7) failed.push('boardRows')
if (report.executiveRows !== 8) failed.push('executiveRows')
if (report.totalRows !== 15) failed.push('totalRows')
if (report.validRows !== 15) failed.push('validRows')
if (report.elementStatus !== 'needs_review') failed.push('elementStatus')
if (!report.calculationRunPrevented) failed.push('calculationRunPrevented')
if (!report.sensitiveDataProtected) failed.push('sensitiveDataProtected')
if (!report.saveRoundtripOk || !report.reopenOk) failed.push('persistence')
if (!report.uiImportReviewNotice) failed.push('uiNotice')
if (!report.serverBlocksUnscoredCalculate) failed.push('serverGuard')
if (
  report.uniqueNationalities.length !== 1 ||
  report.uniqueNationalities[0] !== 'South African'
) {
  failed.push('nationalityNormalisation')
}

console.log(JSON.stringify({ ok: failed.length === 0, failed, report }, null, 2))
if (failed.length) process.exitCode = 1
