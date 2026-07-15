'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { buildProcurementScorecardFilename } from '@/lib/exports/filename'

type ProcurementPdfDownloadButtonProps = {
  assessmentId: string
  companyName: string
  className?: string
}

export function ProcurementPdfDownloadButton({
  assessmentId,
  companyName,
  className = '',
}: ProcurementPdfDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (downloading) return

    try {
      setDownloading(true)
      const pdfApiPath = `/api/procurement/assessments/${encodeURIComponent(assessmentId)}/render-pdf`
      const res = await fetch(pdfApiPath, {
        method: 'GET',
        headers: { Accept: 'application/pdf' },
      })

      if (!res.ok) {
        const text = await res.text()
        if (process.env.NODE_ENV === 'development') {
          console.error('[PDF][procurement] Error', text)
        }
        alert('We could not generate the PDF. Please try again in a moment.')
        return
      }

      const blob = await res.blob()
      if (!blob.size) {
        alert('The PDF file was empty. Please try again.')
        return
      }

      const filename = buildProcurementScorecardFilename(companyName)
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
        console.error('[PDF][procurement] Unexpected error', err)
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
      data-tour="scorecard-export"
      className={className}
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
      <span>{downloading ? 'Preparing PDF…' : 'Download PDF'}</span>
    </button>
  )
}
