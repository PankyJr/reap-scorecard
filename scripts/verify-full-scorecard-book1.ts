import fs from 'node:fs'
import path from 'node:path'
import { importSedBeneficiaryWorkbook } from '../src/lib/scorecard/calculator/elements/socio-economic-development/import'

const workbookPath = path.join(process.cwd(), 'tmp/full-scorecard-reference/Book1.xlsx')

if (!fs.existsSync(workbookPath)) {
  console.error('MISSING', workbookPath)
  process.exit(1)
}

const preview = importSedBeneficiaryWorkbook({ workbookBuffer: fs.readFileSync(workbookPath) })

const report = {
  detectedSheet: preview.sheetName,
  detectedHeaders: preview.detectedHeaders,
  validRowCount: preview.validRowCount,
  warningCount: preview.warningCount,
  rejectedRowCount: preview.rejectedRowCount,
  platformRecognisedTotal: preview.platformTotalRecognised,
  workbookDisplayedTotal: preview.workbookDisplayedTotal,
  totalsMatch: preview.totalsMatch,
  sourceRowNumbers: preview.rows.map((r) => r.sourceRowNumber),
}

console.log(JSON.stringify(report, null, 2))

const ok =
  preview.sheetName === 'SED' &&
  preview.validRowCount === 3 &&
  preview.platformTotalRecognised === 420000 &&
  preview.workbookDisplayedTotal === 420000 &&
  preview.totalsMatch === true

process.exit(ok ? 0 : 2)
