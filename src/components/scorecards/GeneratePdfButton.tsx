'use client'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { FileDown } from 'lucide-react'

interface GeneratePdfButtonProps {
  scorecardId: string
  className?: string
  label?: string
  size?: 'xs' | 'sm' | 'md'
  variant?: 'primary' | 'secondary'
}

export function GeneratePdfButton({
  scorecardId,
  className,
  label = 'Generate PDF report',
  size = 'sm',
  variant = 'secondary',
}: GeneratePdfButtonProps) {
  const handleClick = () => {
    if (typeof window !== 'undefined') {
      const url = `/scorecards/${encodeURIComponent(scorecardId)}/report`
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={buttonStyles({
        variant,
        size,
        className: `no-print ${className ?? ''}`,
      })}
    >
      <FileDown className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}

