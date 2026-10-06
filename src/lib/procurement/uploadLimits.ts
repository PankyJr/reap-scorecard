/**
 * Size limits for the procurement supplier list, end to end.
 *
 * Server actions refuse request bodies above `experimental.serverActions.
 * bodySizeLimit` in next.config.ts (Next's default is 1 MB, which an 8,000-
 * supplier list exceeds). Netlify refuses any function request above 6 MB, and
 * may carry a file upload base64-encoded (a third larger), so the action limit
 * is 4 MB and everything we send stays below it.
 */

export const SERVER_ACTION_BODY_LIMIT_BYTES = 4 * 1024 * 1024

/** Hosting platform ceiling for one request (Netlify Functions). */
export const PLATFORM_REQUEST_LIMIT_BYTES = 6 * 1024 * 1024

/** Room for the multipart boundaries and the other form fields. */
const FORM_OVERHEAD_BYTES = 64 * 1024

/** Largest supplier list file (Excel or CSV) the upload accepts. */
export const PROCUREMENT_UPLOAD_MAX_BYTES = SERVER_ACTION_BODY_LIMIT_BYTES - FORM_OVERHEAD_BYTES

/** Largest encoded supplier list the save sends (8,000 suppliers is about 1 MB). */
export const SUPPLIER_PAYLOAD_MAX_BYTES = SERVER_ACTION_BODY_LIMIT_BYTES - FORM_OVERHEAD_BYTES

export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1).replace(/\.0$/, '')} MB`
}
