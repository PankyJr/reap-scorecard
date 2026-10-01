'use server'

import { checkSpreadsheetFile } from '@/lib/uploads/spreadsheet-file'
import { parseProcurementExcelBuffer } from '@/lib/procurement/excel/parseProcurementWorkbook'
import { logProcurementExcelImportDiagnostics } from '@/lib/procurement/excel/importDebug'
import type { ProcurementExcelParseIssue } from '@/lib/procurement/excel/types'
import type { ProcurementExcelParseSuccess } from '@/lib/procurement/excel/types'

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export type ProcurementExcelParseActionResult =
  | { ok: true; data: ProcurementExcelParseSuccess }
  | { ok: false; issues: ProcurementExcelParseIssue[] }

export async function procurementExcelParseAction(
  formData: FormData,
): Promise<ProcurementExcelParseActionResult> {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return {
      ok: false,
      issues: [{ level: 'error', message: 'No file was uploaded. Choose an Excel file and try again.' }],
    }
  }

  const name = file.name || 'workbook'
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileCheck = checkSpreadsheetFile({ filename: name, bytes: buffer, maxBytes: MAX_UPLOAD_BYTES })
  if (!fileCheck.ok) {
    return { ok: false, issues: [{ level: 'error', message: fileCheck.error }] }
  }

  const preferredRaw = formData.get('preferred_sheet')
  const preferredSheet =
    typeof preferredRaw === 'string' && preferredRaw.trim() !== ''
      ? preferredRaw.trim()
      : null

  const result = parseProcurementExcelBuffer({
    buffer,
    filename: name,
    preferredSheet,
  })

  if (!result.ok) {
    return { ok: false, issues: result.issues }
  }

  logProcurementExcelImportDiagnostics({
    filename: name,
    preferredSheet,
    parsed: result,
  })

  const { debugImportSnapshot, ...clientData } = result
  void debugImportSnapshot
  return { ok: true, data: clientData }
}
