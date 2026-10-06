import { PROCUREMENT_UPLOAD_MAX_BYTES } from '@/lib/procurement/uploadLimits'

/**
 * The largest spreadsheet any upload accepts. Uploads go through server
 * actions, which refuse request bodies above the limit in next.config.ts
 * before our own check runs (see src/lib/procurement/uploadLimits.ts), so a
 * bigger limit here would only be a promise the server cannot keep.
 */
export const SPREADSHEET_UPLOAD_MAX_BYTES = PROCUREMENT_UPLOAD_MAX_BYTES
