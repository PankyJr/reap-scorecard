'use client'

import { useState } from 'react'
import { devLog } from '@/lib/dev-log'
import { buttonStyles } from '@/components/ui/buttonStyles'

interface DownloadReportButtonProps {
  scorecardId: string
  companyName: string
}

export function DownloadReportButton({
  scorecardId,
  companyName,
}: DownloadReportButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const url = `/api/scorecards/${encodeURIComponent(scorecardId)}/render-pdf`
      devLog('[PDF][client] Requesting', url)

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/pdf',
        },
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
        alert('Could not generate the PDF. Please try again or open the printable report from the scorecard page.')
        return
      }

      const blob = await res.blob()
      devLog('[PDF][client] Blob size', blob.size)

      if (!blob.size) {
        alert('The PDF file was empty. Please try again.')
        return
      }

      const filename = `REAP-Scorecard-${companyName.replace(/\s+/g, '_')}.pdf`
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
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={buttonStyles({
        variant: 'secondary',
        size: 'xs',
        className: 'no-print',
      })}
    >
      <span>{downloading ? 'Preparing PDF…' : 'Download PDF'}</span>
    </button>
  )
}

