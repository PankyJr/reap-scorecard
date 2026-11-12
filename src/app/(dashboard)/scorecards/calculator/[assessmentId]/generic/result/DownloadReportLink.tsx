'use client'

import type { ReactNode } from 'react'
import { markReportOpened } from '@/components/help/help-storage'

/**
 * The result page's "Download report" link. Same plain link to the PDF as
 * before; a click also tells Home's getting-started checklist that a report
 * was downloaded (remembered in this browser only).
 */
export function DownloadReportLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={className} onClick={() => markReportOpened()}>
      {children}
    </a>
  )
}
