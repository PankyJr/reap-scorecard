import { parseProcurementExcelBuffer } from '@/lib/procurement/excel/parseProcurementWorkbook'
import type { ProcurementExcelParseResult } from '@/lib/procurement/excel/types'

/** Client-side procurement workbook read — same parser as the live app. */
export async function parseMarketingProcurementFile(
  file: File,
): Promise<ProcurementExcelParseResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const buffer = Buffer.from(bytes)
  return parseProcurementExcelBuffer({
    buffer,
    filename: file.name,
  })
}
