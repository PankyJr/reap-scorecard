import * as XLSX from 'xlsx'
import { toSheetKey } from './sheet-mapping'
import type { ParsedCellData, ParsedWorkbookResult } from './types'

function countColumns(rows: unknown[][]): number {
  return rows.reduce((max, row) => (row.length > max ? row.length : max), 0)
}

const EXCEL_ERROR_CODE_MAP: Record<number, string> = {
  0x00: '#NULL!',
  0x07: '#DIV/0!',
  0x0f: '#VALUE!',
  0x17: '#REF!',
  0x1d: '#NAME?',
  0x24: '#NUM!',
  0x2a: '#N/A',
}

function decodeCellError(value: unknown): string | null {
  if (typeof value === 'number') {
    return EXCEL_ERROR_CODE_MAP[value] ?? '#VALUE!'
  }
  if (typeof value === 'string' && value.startsWith('#')) return value
  return null
}

/** Parse an in-memory workbook (used by scripts and tests; upload flow uses {@link parseWorkbookUpload}). */
export function parseWorkbookFromBuffer(args: {
  filename: string
  buffer: Buffer
  fileSize?: number
}): ParsedWorkbookResult {
  const workbook = XLSX.read(args.buffer, {
    type: 'buffer',
    cellFormula: true,
    cellText: true,
    raw: true,
    dense: false,
  })

  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    }) as unknown[][]

    const parseWarnings: string[] = []
    const cells: Record<string, ParsedCellData> = {}

    for (const [address, cell] of Object.entries(worksheet)) {
      if (address.startsWith('!')) continue
      const typedCell = cell as {
        v?: unknown
        w?: string
        t?: string
        f?: string
      }
      const excelError =
        typedCell.t === 'e' ? decodeCellError(typedCell.v) : null
      cells[address] = {
        address,
        rawValue: excelError ?? typedCell.v,
        displayValue: excelError ?? typedCell.w ?? String(typedCell.v ?? ''),
        cellType: typedCell.t,
        formula: typedCell.f,
      }
      if (excelError) {
        parseWarnings.push(`Cell ${address} contains Excel error ${excelError}.`)
      }
    }

    if (rows.length === 0) {
      parseWarnings.push('Sheet appears empty.')
    }

    return {
      sheetKey: toSheetKey(sheetName),
      sheetName,
      rowCount: rows.length,
      columnCount: countColumns(rows),
      rows,
      cells,
      parseWarnings,
    }
  })

  return {
    filename: args.filename,
    fileSize: args.fileSize ?? args.buffer.length,
    sheets,
    detectedSheetNames: workbook.SheetNames,
  }
}

export async function parseWorkbookUpload(file: File): Promise<ParsedWorkbookResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  return parseWorkbookFromBuffer({
    filename: file.name,
    buffer,
    fileSize: file.size,
  })
}
