'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  CircleHelp,
  Building2,
  ClipboardList,
  Compass,
  FileDown,
  FileSpreadsheet,
  Rocket,
  Upload,
  X,
} from 'lucide-react'
import { buildHelpMenu } from '@/components/tour/guideContext'
import { useTourOptional } from '@/components/tour/TourProvider'

const GUIDE_ICONS: Record<string, typeof Compass> = {
  'first-time-setup': Rocket,
  'full-platform': Compass,
  companies: Building2,
  procurement: ClipboardList,
  'workbook-upload': Upload,
  'export-pdf': FileDown,
}

/** The help button, only where the tour exists (the app shell). */
export function PageHelp() {
  return useTourOptional() ? <HelpLauncher /> : null
}

export function HelpLauncher({ className }: { className?: string }) {
  const pathname = usePathname()
  const tour = useTourOptional()
  const openGuide = tour?.openGuide ?? (() => {})
  const isOpen = tour?.isOpen ?? false
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const menuItems = buildHelpMenu(pathname)
  const alwaysItems = menuItems.filter((i) => i.section === 'always')
  const contextItems = menuItems.filter((i) => i.section === 'context')

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  function startGuide(guideId: string) {
    setMenuOpen(false)
    openGuide(guideId, 0)
  }

  return (
    <div ref={containerRef} className={['relative', className ?? ''].join(' ')}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        disabled={isOpen}
        // A plain icon button in the page header (Halal Lab).
        className={`flex h-11 w-11 items-center justify-center rounded-control text-icon transition-[background-color,color,transform] duration-200 hover:bg-segment hover:text-ink active:scale-[0.96] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 disabled:opacity-50 sm:h-9 sm:w-9 ${menuOpen ? 'bg-segment text-ink' : ''}`}
        data-tour="help help-button"
        aria-label="Need help? Open the help menu"
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
      >
        <CircleHelp className="h-[18px] w-[18px]" aria-hidden />
        <span className="sr-only">Need help?</span>
      </button>

      {menuOpen ? (
        <div
          role="dialog"
          aria-label="Help guides"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-card bg-raised shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal" aria-hidden />
              <p className="text-body font-semibold text-ink">Help guides</p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-1 text-faint transition hover:bg-sunken hover:text-muted"
              aria-label="Close help menu"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto p-2">
            <p className="px-2 pb-1.5 pt-1 text-meta font-medium text-faint">
              Always available
            </p>
            {alwaysItems.map((item) => (
              <GuideMenuItem
                key={item.guideId}
                icon={GUIDE_ICONS[item.guideId] ?? Compass}
                title={item.title}
                description={item.description}
                minutes={item.estimatedMinutes}
                onClick={() => startGuide(item.guideId)}
              />
            ))}

            {contextItems.length > 0 ? (
              <>
                <p className="mt-3 px-2 pb-1.5 pt-1 text-meta font-medium text-faint">
                  Guides for this page
                </p>
                {contextItems.map((item) => (
                  <GuideMenuItem
                    key={item.guideId}
                    icon={GUIDE_ICONS[item.guideId] ?? FileSpreadsheet}
                    title={item.title}
                    description={item.description}
                    minutes={item.estimatedMinutes}
                    onClick={() => startGuide(item.guideId)}
                    highlighted
                  />
                ))}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function GuideMenuItem({
  icon: Icon,
  title,
  description,
  minutes,
  onClick,
  highlighted,
}: {
  icon: typeof Compass
  title: string
  description: string
  minutes?: number
  onClick: () => void
  highlighted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-start gap-3 rounded-control px-3 py-3 text-left transition',
        highlighted
          ? 'bg-brand/[0.05] hover:bg-brand/[0.08]'
          : 'hover:bg-sunken',
      ].join(' ')}
    >
      <span
        className={[
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          highlighted ? 'bg-brand/10 text-teal' : 'bg-sunken text-muted',
        ].join(' ')}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-body font-semibold text-ink">{title}</span>
          {minutes ? (
            <span className="text-meta font-medium tabular-nums text-faint">~{minutes} min</span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-meta leading-relaxed text-muted">{description}</span>
      </span>
    </button>
  )
}
