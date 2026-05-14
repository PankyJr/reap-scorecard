'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'

import { devLog } from '@/lib/dev-log'
import { buttonStyles } from '@/components/ui/buttonStyles'

function safeFilenamePart(name: string): string {
  const s = name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
  return s || 'report'
}

type ReportToolbarProps = {
  backHref: string
  /** Shown next to the back arrow (e.g. "Back to scorecard"). */
  backLabel?: string
  /** GET route that returns application/pdf (e.g. `/api/scorecards/…/render-pdf`). */
  pdfApiPath: string
  /** Base name without extension; will be sanitized for the download filename. */
  filenameBase: string
  className?: string
}

/**
 * Screen-only actions for printable report routes: return to the source screen and download PDF.
 * Hidden when printing via `no-print` on the root element.
 */
export function ReportToolbar({
  backHref,
  backLabel = 'Back',
  pdfApiPath,
  filenameBase,
  className = '',
}: ReportToolbarProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setDownloading(true)
      devLog('[PDF][client] Requesting', pdfApiPath)

      const res = await fetch(pdfApiPath, {
        method: 'GET',
        headers: { Accept: 'application/pdf' },
      })

      devLog('[PDF][client] Response', {
        status: res.status,
        contentType: res.headers.get('content-type'),
      })

      if (!res.ok) {
        const text = await res.text()
        if (process.env.NODE_ENV === 'development') {
          console.error('[PDF][client] Error body', text)
        }
        alert('Could not generate the PDF. Please try again.')
        return
      }

      const blob = await res.blob()
      if (!blob.size) {
        alert('The PDF file was empty. Please try again.')
        return
      }

      const filename = `${safeFilenamePart(filenameBase)}.pdf`
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PDF][client] Unexpected error', err)
      }
      alert('Something went wrong while downloading the PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={`no-print flex flex-wrap items-center gap-2 ${className}`}>
      <Link
        href={backHref}
        className={buttonStyles({
          variant: 'secondary',
          size: 'sm',
          className: 'inline-flex items-center gap-2',
        })}
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {backLabel}
      </Link>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className={buttonStyles({
          variant: 'primary',
          size: 'sm',
          className: 'inline-flex items-center gap-2',
        })}
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        <span>{downloading ? 'Preparing PDF…' : 'Download PDF'}</span>
      </button>
    </div>
  )
}
