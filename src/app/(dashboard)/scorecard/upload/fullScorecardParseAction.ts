'use server'

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

  if (file.size > MAX_FULL_SCORECARD_UPLOAD_BYTES) {
    return {
      ok: false,
      issues: [
        {
          level: 'error',
          message: `This file is too large (${Math.round(file.size / (1024 * 1024))} MB). Maximum size is ${Math.round(MAX_FULL_SCORECARD_UPLOAD_BYTES / (1024 * 1024))} MB.`,
        },
      ],
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = parseFullScorecardWorkbook({ buffer, filename: name })

  if (!result.ok) {
    return { ok: false, issues: result.issues }
  }

  return { ok: true, data: result }
}
