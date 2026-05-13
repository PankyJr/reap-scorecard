'use server'

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
  const lower = name.toLowerCase()
  if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
    return {
      ok: false,
      issues: [
        {
          level: 'error',
          message: 'Unsupported file type. Please upload an Excel workbook (.xlsx or .xls).',
        },
      ],
    }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      issues: [
        {
          level: 'error',
          message: `This file is too large (${Math.round(file.size / (1024 * 1024))} MB). Maximum size is ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
        },
      ],
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
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
