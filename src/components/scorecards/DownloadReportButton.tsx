'use client'

import { useState } from 'react'

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
      console.log('[PDF][client] Requesting', url)

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/pdf',
        },
      })

      console.log('[PDF][client] Response', {
        status: res.status,
        contentType: res.headers.get('content-type'),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('[PDF][client] Error body', text)
        alert('Failed to generate PDF report. See console for details.')
        return
      }

      const blob = await res.blob()
      console.log('[PDF][client] Blob size', blob.size)

      if (!blob.size) {
        alert('Generated PDF is empty. See console for server logs.')
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
      console.error('[PDF][client] Unexpected error', err)
      alert('Unexpected error while downloading PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className="no-print inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-60"
    >
      <span>{downloading ? 'Preparing PDF…' : 'Download PDF'}</span>
    </button>
  )
}

