/**
 * Full workbook PDF requires a local Chromium install and is not supported on
 * serverless hosts (e.g. Netlify). Hide the action in client-facing workflows.
 */
export function isFullWorkbookPdfExportAvailable(): boolean {
  if (process.env.NEXT_PUBLIC_FULL_WORKBOOK_PDF === 'true') return true
  if (process.env.NEXT_PUBLIC_FULL_WORKBOOK_PDF === 'false') return false
  // NETLIFY is set while building; AWS_LAMBDA_FUNCTION_NAME while a Netlify function runs.
  const host = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
  return !host
}
