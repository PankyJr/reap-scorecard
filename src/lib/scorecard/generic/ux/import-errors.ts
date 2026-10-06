/**
 * What the workbook upload screen may say when an import fails. Our own
 * messages are plain already: the file checks start with the file's name in
 * curly quotes, and the confirmation step has three instructions of its own.
 * Anything else comes from the spreadsheet library ("Corrupted zip …") and is
 * replaced with the plain fallback.
 */
const OWN_INSTRUCTIONS = ['Confirm that procurement', 'Accept the import warnings', 'Acknowledge that missing fields']

export function plainWorkbookError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : ''
  if (message.startsWith('“') || OWN_INSTRUCTIONS.some((start) => message.startsWith(start))) return message
  return fallback
}

export const WORKBOOK_UNREADABLE =
  'We could not read this workbook. Open it in Excel, save it again as .xlsx, and upload that copy.'
export const IMPORT_NOT_FINISHED =
  'The import could not be finished, and nothing was changed. Try again; if it keeps happening, contact REAP support.'
