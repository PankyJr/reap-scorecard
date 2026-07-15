'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
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
import { useTour } from '@/components/tour/TourProvider'

const GUIDE_ICONS: Record<string, typeof Compass> = {
  'first-time-setup': Rocket,
  'full-platform': Compass,
  companies: Building2,
  procurement: ClipboardList,
  'workbook-upload': Upload,
  'export-pdf': FileDown,
}

export function HelpLauncher({ className }: { className?: string }) {
  const pathname = usePathname()
  const { openGuide, isOpen } = useTour()
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
        className={[
          'group inline-flex h-9 items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition',
          'hover:border-[#063b3f]/25 hover:bg-[#063b3f]/[0.04] hover:text-[#063b3f]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#063b3f]/30 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          menuOpen ? 'border-[#063b3f]/25 bg-[#063b3f]/[0.04] text-[#063b3f]' : '',
        ].join(' ')}
        data-tour="help help-button"
        aria-label="Open help menu"
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#063b3f]/10 text-[#063b3f] transition group-hover:bg-[#063b3f]/15">
          <Compass className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="hidden sm:inline">Need help?</span>
      </button>

      {menuOpen ? (
        <div
          role="dialog"
          aria-label="Help guides"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.22)]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#063b3f]" aria-hidden />
              <p className="text-sm font-semibold text-slate-900">Help guides</p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close help menu"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto p-2">
            <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                <p className="mt-3 px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
        'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition',
        highlighted
          ? 'bg-[#063b3f]/[0.05] hover:bg-[#063b3f]/[0.08]'
          : 'hover:bg-slate-50',
      ].join(' ')}
    >
      <span
        className={[
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          highlighted ? 'bg-[#063b3f]/10 text-[#063b3f]' : 'bg-slate-100 text-slate-600',
        ].join(' ')}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {minutes ? (
            <span className="text-[10px] font-medium tabular-nums text-slate-400">~{minutes} min</span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
    </button>
  )
}
