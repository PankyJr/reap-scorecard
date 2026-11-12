'use client'

import { useEffect } from 'react'
import { markReportOpened } from './help-storage'

/**
 * Renders nothing. Placed on a full-scorecard report page so Home's
 * getting-started item "Download the report" ticks itself once a report has
 * been opened in this browser. Stored in this browser only; nothing is saved.
 */
export function MarkReportOpened() {
  useEffect(() => {
    markReportOpened()
  }, [])
  return null
}
