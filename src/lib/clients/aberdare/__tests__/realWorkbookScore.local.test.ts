import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseAberdareSpendReport,
  calculateAberdareScenario,
  findDemoLevel1Supplier,
} from '@/lib/clients/aberdare'

const workbookPath = path.resolve(
  process.cwd(),
  'client-inputs/aberdare/BBBEE Spend Report.xlsx',
)

describe.skipIf(!fs.existsSync(workbookPath))(
  'Aberdare real workbook scoring (local only)',
  () => {
    it('computes provisional position for meeting report', () => {
      const buffer = fs.readFileSync(workbookPath)
      const result = parseAberdareSpendReport(
        buffer,
        'BBBEE Spend Report.xlsx',
        {
          read: (data, opts) => XLSX.read(data, opts),
          utils: {
            sheet_to_json: (sheet, opts) =>
              XLSX.utils.sheet_to_json(sheet, opts) as unknown[][],
          },
        },
      )
      const actual = calculateAberdareScenario(result.suppliers, {}, 'Report')
      const target = findDemoLevel1Supplier(result.suppliers)!
      const scenario = calculateAberdareScenario(
        result.suppliers,
        {
          [target.id]: {
            compliance_status: 'non-compliant',
            level: 'Non-Compliant',
          },
        },
        'Report',
      )

      const out = {
        suppliers: result.suppliers.length,
        sourceSpend: result.reconciliation.sourceSpendTotal,
        importCount: result.reconciliation.explicitImportCount,
        importSpend: result.reconciliation.explicitImportSpend,
        importExempt: result.reconciliation.importSpendExemptTotal,
        points: actual.actual.totalScore,
        max: actual.actual.maxPoints,
        recognised: actual.actual.recognisedBbbeeSpend,
        eligible: actual.actual.totalMeasuredSpend,
        importedTracked: actual.actual.importedSpend,
        demoSupplier: {
          name: target.vendorName,
          code: target.vendorCode,
          spend: target.amountExVat,
          level: target.level,
        },
        scenarioPoints: scenario.scenario.totalScore,
        impact: scenario.pointsDifference,
        mismatches: result.reconciliation.mismatches,
      }
      fs.mkdirSync(path.resolve('artifacts/aberdare-demo'), { recursive: true })
      fs.writeFileSync(
        path.resolve('artifacts/aberdare-demo/provisional-calc-local.json'),
        JSON.stringify(out, null, 2),
      )
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(out, null, 2))
      expect(result.suppliers.length).toBe(940)
    })
  },
)
