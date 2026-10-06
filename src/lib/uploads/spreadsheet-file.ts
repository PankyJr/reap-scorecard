/**
 * One check for every Excel upload in the app.
 *
 * The spreadsheet library is lenient: given a text file, a PDF or an image
 * renamed to .xlsx it happily returns a one-sheet "workbook", which the
 * scorecard then showed as "1 of 22 sheets" with nothing readable. This looks
 * at the file's actual bytes, not just its name, and returns a plain-English
 * reason when the file is not a usable workbook.
 *
 *   .xlsx is a ZIP package whose contents include xl/workbook.xml.
 *   .xls  is an OLE2 compound file (D0 CF 11 E0 A1 B1 1A E1).
 *   A password-protected .xlsx is also an OLE2 file, not a ZIP; it is named
 *   as such because it cannot be read without the password.
 */

export type SpreadsheetFileCheck = { ok: true; kind: 'xlsx' | 'xls' | 'csv' } | { ok: false; error: string }

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((b, i) => bytes[i] === b)
}

/** ZIP stores entry names as plain ASCII, so a byte search finds them. */
function containsAscii(bytes: Uint8Array, text: string): boolean {
  const needle = Array.from(text, (c) => c.charCodeAt(0))
  const last = bytes.length - needle.length
  outer: for (let i = 0; i <= last; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

function megabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1).replace(/\.0$/, '')} MB`
}

/** The same words whether the browser or the server notices the file is too big. */
export function fileTooLargeMessage(filename: string, size: number, maxBytes: number): string {
  return `“${filename || 'The file'}” is ${megabytes(size)}, which is larger than the ${megabytes(maxBytes)} limit. Remove unused sheets or images and try again.`
}

export function uploadLimitLabel(maxBytes: number): string {
  return megabytes(maxBytes)
}

export function checkSpreadsheetFile(args: {
  filename: string
  bytes: Uint8Array
  maxBytes: number
  /** Accept only .xlsx (the full-workbook calculator cannot read .xls). */
  xlsxOnly?: boolean
  /** Also accept a plain-text .csv file (supplier lists). */
  allowCsv?: boolean
}): SpreadsheetFileCheck {
  const name = args.filename || 'The file'
  const lower = name.toLowerCase()
  const size = args.bytes.byteLength
  const allowCsv = Boolean(args.allowCsv) && !args.xlsxOnly
  const allowed = args.xlsxOnly
    ? 'an Excel workbook (.xlsx)'
    : allowCsv
      ? 'an Excel workbook (.xlsx or .xls) or a CSV file (.csv)'
      : 'an Excel workbook (.xlsx or .xls)'

  if (size === 0) {
    return { ok: false, error: `“${name}” is empty. Choose the saved Excel workbook and upload it again.` }
  }
  if (size > args.maxBytes) {
    return { ok: false, error: fileTooLargeMessage(name, size, args.maxBytes) }
  }

  const isXlsxName = lower.endsWith('.xlsx')
  const isXlsName = lower.endsWith('.xls')
  const isCsvName = lower.endsWith('.csv')
  if (isCsvName && allowCsv) return checkCsvBytes(name, args.bytes)
  if (!isXlsxName && !(isXlsName && !args.xlsxOnly)) {
    return {
      ok: false,
      error: allowCsv
        ? `“${name}” is not ${allowed}. Upload the supplier list saved from Excel, or saved as CSV.`
        : `“${name}” is not ${allowed}. Upload the workbook saved from Excel.`,
    }
  }

  const notAWorkbook =
    `“${name}” is not a valid Excel workbook. It may be a different kind of file that was renamed, or it may be damaged. ` +
    'Open it in Excel, choose Save As, pick “Excel Workbook (.xlsx)”, and upload that copy.'

  if (startsWith(args.bytes, ZIP_SIGNATURE)) {
    if (!isXlsxName) return { ok: false, error: notAWorkbook }
    // A Word document or any other ZIP renamed to .xlsx has no workbook part.
    if (!containsAscii(args.bytes, 'xl/workbook')) return { ok: false, error: notAWorkbook }
    return { ok: true, kind: 'xlsx' }
  }

  if (startsWith(args.bytes, OLE2_SIGNATURE)) {
    if (isXlsxName) {
      return {
        ok: false,
        error: `“${name}” is password-protected, so it cannot be read. Open it in Excel, remove the password (File, Info, Protect Workbook), save, and upload it again.`,
      }
    }
    if (args.xlsxOnly) return { ok: false, error: `“${name}” is an older .xls file. Save it as .xlsx in Excel and upload that copy.` }
    return { ok: true, kind: 'xls' }
  }

  return { ok: false, error: notAWorkbook }
}

/**
 * A CSV file is plain text. A workbook, PDF or image renamed to .csv is not:
 * it starts with a binary signature or contains NUL bytes.
 */
function checkCsvBytes(name: string, bytes: Uint8Array): SpreadsheetFileCheck {
  const notText =
    `“${name}” is not a CSV text file. It may be a workbook or another kind of file that was renamed. ` +
    'Upload the Excel workbook itself, or in Excel choose Save As and pick “CSV UTF-8 (Comma delimited)”.'
  if (startsWith(bytes, ZIP_SIGNATURE) || startsWith(bytes, OLE2_SIGNATURE)) return { ok: false, error: notText }
  const scan = Math.min(bytes.length, 64 * 1024)
  for (let i = 0; i < scan; i++) {
    if (bytes[i] === 0) return { ok: false, error: notText }
  }
  return { ok: true, kind: 'csv' }
}
