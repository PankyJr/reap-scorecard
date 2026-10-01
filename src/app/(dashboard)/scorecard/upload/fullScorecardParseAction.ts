'use server'

import { checkSpreadsheetFile } from '@/lib/uploads/spreadsheet-file'
import { parseFullScorecardWorkbook } from '@/lib/scorecard-upload/parseFullScorecardWorkbook'
import { MAX_FULL_SCORECARD_UPLOAD_BYTES } from '@/lib/scorecard-upload/constants'
import type { FullScorecardParseIssue, FullScorecardParseSuccess } from '@/lib/scorecard-upload/types'

export type FullScorecardParseActionResult =
  | { ok: true; data: FullScorecardParseSuccess }
  | { ok: false; issues: FullScorecardParseIssue[] }

export async function fullScorecardParseAction(formData: FormData): Promise<FullScorecardParseActionResult> {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return {
      ok: false,
      issues: [{ level: 'error', message: 'No file was uploaded. Choose an Excel file and try again.' }],
    }
  }

  const name = file.name || 'workbook'
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileCheck = checkSpreadsheetFile({ filename: name, bytes: buffer, maxBytes: MAX_FULL_SCORECARD_UPLOAD_BYTES })
  if (!fileCheck.ok) {
    return { ok: false, issues: [{ level: 'error', message: fileCheck.error }] }
  }

  const result = parseFullScorecardWorkbook({ buffer, filename: name })

  if (!result.ok) {
    return { ok: false, issues: result.issues }
  }

  return { ok: true, data: result }
}
