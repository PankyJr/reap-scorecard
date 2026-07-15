/** Sanitize a string for use in download filenames. */
export function safeFilenamePart(name: string): string {
  const s = name
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64)
  return s || 'Client'
}

export function formatExportDate(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function buildProcurementScorecardFilename(
  companyName: string,
  date = new Date(),
): string {
  return `REAP_Procurement_Scorecard_${safeFilenamePart(companyName)}_${formatExportDate(date)}.pdf`
}
