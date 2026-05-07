'use client'
import { buttonStyles } from '@/components/ui/buttonStyles'

// Simple visual export that uses the browser's print → Save as PDF
// from the clean report layout, so what you see is what you get.

interface VisualReportDownloadButtonProps {
  companyName: string
}

export function VisualReportDownloadButton({}: VisualReportDownloadButtonProps) {
  const handleClick = () => {
    if (typeof window === 'undefined') return
    window.print()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={buttonStyles({
        variant: 'secondary',
        size: 'xs',
        className: 'no-print',
      })}
    >
      <span>Print / Save as PDF</span>
    </button>
  )
}

